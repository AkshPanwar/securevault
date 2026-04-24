const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { protect } = require('../middleware/auth');
const { upload, handleUploadError } = require('../middleware/upload');
const { uploadLimiter, generalLimiter } = require('../middleware/rateLimiter');
const { fileEditValidation } = require('../middleware/validation');

router.use(protect);
router.use(generalLimiter);

router.get('/stats', fileController.getStats);
router.get('/', fileController.getFiles);
router.get('/:id', fileController.getFile);
router.get('/:id/download', fileController.downloadFile);
router.get('/:id/preview', fileController.previewFile);
router.get('/:id/content', fileController.getFileContent);
router.get('/:id/verify', fileController.verifyEncryption);

router.post('/upload', uploadLimiter, upload.array('files', 10), handleUploadError, fileController.uploadFile);
router.patch('/:id', fileEditValidation, fileController.updateFile);
router.put('/:id/content', fileController.updateFileContent);
router.delete('/:id', fileController.deleteFile);
router.patch('/:id/restore', fileController.restoreFile);

module.exports = router;
