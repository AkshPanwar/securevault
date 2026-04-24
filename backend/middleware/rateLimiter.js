const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: {
    success: false,
    message: 'Too many uploads, please try again later.',
  },
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
});

module.exports = { authLimiter, uploadLimiter, generalLimiter };
