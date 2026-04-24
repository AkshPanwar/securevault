const express = require('express');
const router = express.Router();
const shareController = require('../controllers/shareController');
const { protect } = require('../middleware/auth');
const { shareValidation } = require('../middleware/validation');
const { generalLimiter } = require('../middleware/rateLimiter');

// Public route
router.get('/public/:token', shareController.getPublicFile);

// Protected routes
router.use(protect);
router.use(generalLimiter);

router.post('/:fileId/share', shareValidation, shareController.shareFile);
router.delete('/:fileId/share/:userId', shareController.unshareFile);
router.post('/:fileId/public-link', shareController.createPublicLink);
router.delete('/:fileId/public-link', shareController.revokePublicLink);

module.exports = router;
