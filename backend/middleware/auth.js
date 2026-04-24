const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

/**
 * Protect routes - verify JWT
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Token missing.',
      });
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists.',
      });
    }

    if (user.isLocked()) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token.' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    next(error);
  }
};

/**
 * Restrict to specific roles
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

/**
 * Log audit events
 */
const auditLog = (action, resource = null) => {
  return async (req, res, next) => {
    res.on('finish', async () => {
      try {
        await AuditLog.create({
          user: req.user?._id,
          action,
          resource,
          resourceId: req.params?.id,
          details: { method: req.method, path: req.path },
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers['user-agent'],
          success: res.statusCode < 400,
        });
      } catch (err) {
        console.error('Audit log error:', err);
      }
    });
    next();
  };
};

module.exports = { protect, restrictTo, auditLog };
