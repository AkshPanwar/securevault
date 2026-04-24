const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { body } = require('express-validator');
const { handleValidation } = require('../middleware/validation');

router.use(protect);
router.use(generalLimiter);

router.get('/profile', userController.getProfile);
router.patch('/profile', [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 chars'),
  handleValidation,
], userController.updateProfile);
router.patch('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number and special character'),
  handleValidation,
], userController.changePassword);
router.get('/audit-log', userController.getAuditLog);
router.get('/search', userController.searchUsers);

module.exports = router;
