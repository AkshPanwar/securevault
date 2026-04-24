const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { signupValidation, loginValidation, otpValidation } = require('../middleware/validation');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

router.post('/signup', authLimiter, signupValidation, authController.signup);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/verify-email', authLimiter, otpValidation, [
  body('userId').notEmpty().withMessage('User ID required'),
  handleValidation,
], authController.verifyEmail);
router.post('/verify-2fa', authLimiter, otpValidation, [
  body('userId').notEmpty().withMessage('User ID required'),
  handleValidation,
], authController.verify2FA);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', protect, authController.logout);
router.post('/resend-otp', authLimiter, [
  body('userId').notEmpty().withMessage('User ID required'),
  handleValidation,
], authController.resendOTP);
router.patch('/toggle-2fa', protect, [
  body('enable').isBoolean().withMessage('Enable must be boolean'),
  handleValidation,
], authController.toggle2FA);
router.get('/me', protect, authController.getMe);

module.exports = router;
