const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcryptjs');

/**
 * GET /api/users/profile
 */
exports.getProfile = async (req, res) => {
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
};

/**
 * PATCH /api/users/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const allowed = ['name', 'avatar'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: { user: user.toSafeObject() } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/change-password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens
    await User.findByIdAndUpdate(req.user._id, { $set: { refreshTokens: [] } });

    await AuditLog.create({
      user: req.user._id,
      action: 'PASSWORD_CHANGE',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/audit-log
 */
exports.getAuditLog = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find({ user: req.user._id })
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit)),
      AuditLog.countDocuments({ user: req.user._id }),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: { page: parseInt(page), limit: parseInt(limit), total },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/search?q=email
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 3) {
      return res.json({ success: true, data: { users: [] } });
    }

    const users = await User.find({
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
      _id: { $ne: req.user._id },
    }).select('name email avatar').limit(10);

    res.json({ success: true, data: { users } });
  } catch (error) {
    next(error);
  }
};
