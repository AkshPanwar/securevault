const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { checkExtension } = require('../utils/malwareDetection');

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const tempDir = path.join(uploadDir, 'temp');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}_${Date.now()}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  // Check extension before upload
  const extCheck = checkExtension(file.originalname);
  if (!extCheck.safe) {
    cb(new Error(extCheck.reason), false);
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
    files: 10,
  },
});

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        message: `File too large. Maximum size is ${(parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024) / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, handleUploadError };
