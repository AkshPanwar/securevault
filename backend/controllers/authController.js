const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { generateOTP, getOTPExpiry, isOTPExpired, sendOTPEmail } = require('../utils/otp');

const getClientInfo = (req) => ({
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'],
});

/**
 * POST /api/auth/signup
 */
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    // Generate OTP for email verification
    const otp = generateOTP();
    const otpExpiry = getOTPExpiry(10);

    const user = await User.create({
      name,
      email,
      password,
      otpCode: otp,
      otpExpiry,
    });

    await sendOTPEmail(email, otp, name);

    await AuditLog.create({
      user: user._id,
      action: 'SIGNUP',
      ...getClientInfo(req),
    });

    res.status(201).json({
      success: true,
      message: 'Account created. Please verify your email with the OTP sent.',
      data: { userId: user._id, requiresOTP: true },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-email
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+otpCode +otpExpiry');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ success: false, message: 'Email already verified.' });
    }

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    if (isOTPExpired(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
    }

    user.isEmailVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: '2FA_VERIFY',
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'Email verified successfully.',
      data: {
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password +otpCode +otpExpiry +twoFactorSecret');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isLocked()) {
      const lockTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked. Try again in ${lockTime} minutes.`,
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      await AuditLog.create({
        user: user._id,
        action: 'FAILED_LOGIN',
        ...getClientInfo(req),
        success: false,
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Reset login attempts
    if (user.loginAttempts > 0) {
      await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
    }

    if (!user.isEmailVerified) {
      // Resend OTP
      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiry = getOTPExpiry(10);
      await user.save();
      await sendOTPEmail(email, otp, user.name);

      return res.json({
        success: true,
        message: 'Please verify your email. OTP resent.',
        data: { userId: user._id, requiresEmailVerification: true },
      });
    }

    // 2FA check
    if (user.twoFactorEnabled) {
      const otp = generateOTP();
      user.otpCode = otp;
      user.otpExpiry = getOTPExpiry(10);
      await user.save();
      await sendOTPEmail(email, otp, user.name);

      return res.json({
        success: true,
        message: '2FA code sent to your email.',
        data: { userId: user._id, requires2FA: true },
      });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Clean old refresh tokens and save new one
    user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date()).slice(-5);
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: 'LOGIN',
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-2fa
 */
exports.verify2FA = async (req, res, next) => {
  try {
    const { userId, otp } = req.body;

    const user = await User.findById(userId).select('+otpCode +otpExpiry');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (!user.otpCode || user.otpCode !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    if (isOTPExpired(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP expired.' });
    }

    user.otpCode = undefined;
    user.otpExpiry = undefined;

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens = user.refreshTokens.filter(t => t.expiresAt > new Date()).slice(-5);
    user.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    user.lastLogin = new Date();
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: '2FA_VERIFY',
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: '2FA verified successfully.',
      data: {
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    const tokenExists = user.refreshTokens.some(t => t.token === refreshToken && t.expiresAt > new Date());
    if (!tokenExists) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const newAccessToken = generateAccessToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    // Rotate refresh token
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await user.save();

    res.json({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken && req.user) {
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: { token: refreshToken } },
      });
    }

    await AuditLog.create({
      user: req.user?._id,
      action: 'LOGOUT',
      ...getClientInfo(req),
    });

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 */
exports.resendOTP = async (req, res, next) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otp = generateOTP();
    await User.findByIdAndUpdate(userId, {
      otpCode: otp,
      otpExpiry: getOTPExpiry(10),
    });

    await sendOTPEmail(user.email, otp, user.name);

    res.json({ success: true, message: 'OTP resent successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/toggle-2fa
 */
exports.toggle2FA = async (req, res, next) => {
  try {
    const user = req.user;
    const { enable } = req.body;

    user.twoFactorEnabled = enable;
    await user.save();

    await AuditLog.create({
      user: user._id,
      action: enable ? '2FA_ENABLE' : '2FA_DISABLE',
      ...getClientInfo(req),
    });

    res.json({
      success: true,
      message: `Two-factor authentication ${enable ? 'enabled' : 'disabled'}.`,
      data: { twoFactorEnabled: user.twoFactorEnabled },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
};
