const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const File = require('../models/File');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { encryptFile, decryptFile, decryptFileStream, encryptText, generateChecksum } = require('../utils/encryption');
const { scanFile } = require('../utils/malwareDetection');
const { getSecurityAssessment } = require('../utils/securityScore');

const TEXT_EDITABLE_EXTENSIONS = ['.txt', '.md', '.json'];

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const encryptedDir = path.join(uploadDir, 'encrypted');

if (!fs.existsSync(encryptedDir)) {
  fs.mkdirSync(encryptedDir, { recursive: true });
}

/**
 * POST /api/files/upload
 */
exports.uploadFile = async (req, res, next) => {
  const tempFilePaths = [];
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const uploadedFiles = [];

    for (const file of req.files) {
      tempFilePaths.push(file.path);

      // Scan for malware
      const scanResult = await scanFile(file.path, file.originalname, file.mimetype, file.size);

      if (scanResult.status === 'blocked') {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: `File rejected: ${scanResult.issues.join(', ')}`,
        });
      }

      // Check user storage limit
      const user = await User.findById(req.user._id);
      if (user.storageUsed + file.size > user.storageLimit) {
        fs.unlinkSync(file.path);
        return res.status(413).json({
          success: false,
          message: 'Storage limit exceeded.',
        });
      }

      // Generate encrypted filename
      const encryptedName = `${uuidv4()}.enc`;
      const encryptedPath = path.join(encryptedDir, encryptedName);

      // Encrypt the file
      const { iv } = await encryptFile(file.path, encryptedPath);

      // Generate checksum of original file
      const checksum = await generateChecksum(file.path);

      // Remove temp file
      fs.unlinkSync(file.path);

      const encryptedStats = fs.statSync(encryptedPath);

      // Security assessment (deterministic)
      const { securityScore, riskLevel } = getSecurityAssessment({
        name: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      });

      // Is this file text-editable?
      const fileExt = path.extname(file.originalname).toLowerCase();
      const isTextEditable = TEXT_EDITABLE_EXTENSIONS.includes(fileExt);

      // Save to DB
      const newFile = await File.create({
        name: file.originalname,
        originalName: file.originalname,
        encryptedName,
        mimeType: file.mimetype,
        size: file.size,
        encryptedSize: encryptedStats.size,
        owner: req.user._id,
        path: encryptedPath,
        isEncrypted: true,
        encryptionType: 'AES-256-CBC',
        iv,
        checksum,
        folder: req.body.folder || 'root',
        malwareScanStatus: scanResult.status,
        malwareScanDetails: scanResult.warnings.join('; '),
        securityScore,
        riskLevel,
        isTextEditable,
      });

      // Update storage used
      await User.findByIdAndUpdate(req.user._id, {
        $inc: { storageUsed: file.size },
      });

      await AuditLog.create({
        user: req.user._id,
        action: 'FILE_UPLOAD',
        resource: 'File',
        resourceId: newFile._id,
        details: { filename: file.originalname, size: file.size },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      uploadedFiles.push(newFile.toSafeObject());
    }

    res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully.`,
      data: { files: uploadedFiles },
    });
  } catch (error) {
    // Cleanup temp files on error
    for (const p of tempFilePaths) {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    next(error);
  }
};

/**
 * GET /api/files
 */
exports.getFiles = async (req, res, next) => {
  try {
    const {
      folder = 'root',
      sort = '-createdAt',
      search,
      starred,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {
      owner: req.user._id,
      isDeleted: false,
    };

    if (folder !== 'all') query.folder = folder;
    if (starred === 'true') query.isStarred = true;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [files, total] = await Promise.all([
      File.find(query)
        .populate('owner', 'name email avatar')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      File.countDocuments(query),
    ]);

    // Also get shared files
    let sharedFiles = [];
    if (folder === 'all' || folder === 'shared') {
      sharedFiles = await File.find({
        'sharedWith.user': req.user._id,
        isDeleted: false,
      }).populate('owner', 'name email avatar');
    }

    res.json({
      success: true,
      data: {
        files: files.map(f => f.toSafeObject()),
        sharedFiles: sharedFiles.map(f => f.toSafeObject()),
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/:id
 */
exports.getFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('sharedWith.user', 'name email avatar');

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    // Check access
    const isOwner = file.owner._id.toString() === req.user._id.toString();
    const sharedEntry = file.sharedWith.find(s => s.user?._id.toString() === req.user._id.toString());

    if (!isOwner && !sharedEntry) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await File.findByIdAndUpdate(req.params.id, { lastAccessed: new Date() });

    await AuditLog.create({
      user: req.user._id,
      action: 'FILE_VIEW',
      resource: 'File',
      resourceId: file._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      data: {
        file: file.toSafeObject(),
        permission: isOwner ? 'owner' : sharedEntry.permission,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/:id/download
 */
exports.downloadFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).select('+path +iv');

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    const sharedEntry = file.sharedWith.find(s => s.user?.toString() === req.user._id.toString());

    if (!isOwner && !sharedEntry) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (sharedEntry && sharedEntry.permission === 'view') {
      return res.status(403).json({ success: false, message: 'You only have view permission.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ success: false, message: 'File data not found.' });
    }

    // Decrypt and stream
    const decryptStream = decryptFileStream(file.path, file.iv);

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Type', file.mimeType);

    decryptStream.pipe(res);

    decryptStream.on('end', async () => {
      await File.findByIdAndUpdate(req.params.id, {
        $inc: { downloadCount: 1 },
        lastAccessed: new Date(),
      });
      await AuditLog.create({
        user: req.user._id,
        action: 'FILE_DOWNLOAD',
        resource: 'File',
        resourceId: file._id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });
    });

    decryptStream.on('error', next);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/:id/preview
 */
exports.previewFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).select('+path +iv');

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    const sharedEntry = file.sharedWith.find(s => s.user?.toString() === req.user._id.toString());

    if (!isOwner && !sharedEntry) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ success: false, message: 'File data not found.' });
    }

    const decryptStream = decryptFileStream(file.path, file.iv);

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);

    decryptStream.pipe(res);
    decryptStream.on('error', next);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/files/:id
 */
exports.updateFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      const shared = file.sharedWith.find(s => s.user?.toString() === req.user._id.toString());
      if (!shared || shared.permission !== 'edit') {
        return res.status(403).json({ success: false, message: 'No edit permission.' });
      }
    }

    const allowed = ['name', 'description', 'tags', 'folder', 'isStarred'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updatedFile = await File.findByIdAndUpdate(req.params.id, updates, { new: true });

    await AuditLog.create({
      user: req.user._id,
      action: 'FILE_EDIT',
      resource: 'File',
      resourceId: file._id,
      details: updates,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, data: { file: updatedFile.toSafeObject() } });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/files/:id
 */
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can delete files.' });
    }

    const permanent = req.query.permanent === 'true';

    if (permanent) {
      // Hard delete - remove encrypted file
      const encPath = await File.findById(req.params.id).select('+path');
      if (encPath.path && fs.existsSync(encPath.path)) {
        fs.unlinkSync(encPath.path);
      }
      await File.findByIdAndDelete(req.params.id);
      await User.findByIdAndUpdate(req.user._id, { $inc: { storageUsed: -file.size } });
    } else {
      // Soft delete
      await File.findByIdAndUpdate(req.params.id, {
        isDeleted: true,
        deletedAt: new Date(),
      });
    }

    await AuditLog.create({
      user: req.user._id,
      action: 'FILE_DELETE',
      resource: 'File',
      resourceId: file._id,
      details: { permanent },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: permanent ? 'File permanently deleted.' : 'File moved to trash.' });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/files/:id/restore
 */
exports.restoreFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) return res.status(404).json({ success: false, message: 'File not found.' });
    if (!file.isDeleted) return res.status(400).json({ success: false, message: 'File is not deleted.' });
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    await File.findByIdAndUpdate(req.params.id, {
      isDeleted: false,
      $unset: { deletedAt: 1 },
    });

    res.json({ success: true, message: 'File restored.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/stats
 */
exports.getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [total, totalSize, shared, starred, deleted] = await Promise.all([
      File.countDocuments({ owner: userId, isDeleted: false }),
      File.aggregate([
        { $match: { owner: userId, isDeleted: false } },
        { $group: { _id: null, total: { $sum: '$size' } } },
      ]),
      File.countDocuments({ 'sharedWith.user': userId, isDeleted: false }),
      File.countDocuments({ owner: userId, isStarred: true, isDeleted: false }),
      File.countDocuments({ owner: userId, isDeleted: true }),
    ]);

    const user = await User.findById(userId);

    res.json({
      success: true,
      data: {
        totalFiles: total,
        totalSize: totalSize[0]?.total || 0,
        sharedFiles: shared,
        starredFiles: starred,
        deletedFiles: deleted,
        storageUsed: user.storageUsed,
        storageLimit: user.storageLimit,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/:id/content
 * Returns decrypted text content for editable files
 */
exports.getFileContent = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).select('+path +iv');

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    if (!isOwner) {
      const shared = file.sharedWith.find(s => s.user?.toString() === req.user._id.toString());
      if (!shared) return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!file.isTextEditable) {
      return res.status(400).json({ success: false, message: 'File is not text-editable.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ success: false, message: 'File data not found.' });
    }

    const buffer = await decryptFile(file.path, file.iv);
    const content = buffer.toString('utf8');

    res.json({
      success: true,
      data: {
        content,
        checksum: file.checksum,
        contentVersions: file.contentVersions || [],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/files/:id/content
 * Updates and re-encrypts text content
 */
exports.updateFileContent = async (req, res, next) => {
  try {
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ success: false, message: 'Content must be a string.' });
    }

    const file = await File.findById(req.params.id).select('+path +iv');

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can edit file content.' });
    }

    if (!file.isTextEditable) {
      return res.status(400).json({ success: false, message: 'File is not text-editable.' });
    }

    // Write content to a temp file, then re-encrypt
    const tmpPath = path.join(uploadDir, `tmp_${uuidv4()}`);
    fs.writeFileSync(tmpPath, content, 'utf8');

    // Re-encrypt to same encrypted path
    const { iv: newIv } = await encryptFile(tmpPath, file.path);

    // New checksum from temp file
    const newChecksum = await generateChecksum(tmpPath);
    fs.unlinkSync(tmpPath);

    const encryptedStats = fs.statSync(file.path);
    const newSize = Buffer.byteLength(content, 'utf8');

    // Security re-assessment
    const { securityScore, riskLevel } = getSecurityAssessment({
      name: file.originalName,
      size: newSize,
      mimeType: file.mimeType,
    });

    // Push to contentVersions
    const versionEntry = {
      version: (file.contentVersions?.length || 0) + 1,
      checksum: newChecksum,
      size: newSize,
      editedAt: new Date(),
      editedBy: req.user._id,
    };

    const updatedFile = await File.findByIdAndUpdate(
      req.params.id,
      {
        iv: newIv,
        checksum: newChecksum,
        size: newSize,
        encryptedSize: encryptedStats.size,
        securityScore,
        riskLevel,
        updatedAt: new Date(),
        $push: { contentVersions: versionEntry },
      },
      { new: true }
    );

    await AuditLog.create({
      user: req.user._id,
      action: 'FILE_EDIT',
      resource: 'File',
      resourceId: file._id,
      details: { contentEdit: true, newSize, version: versionEntry.version },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'File content updated and re-encrypted.',
      data: { file: updatedFile.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/files/:id/verify
 * Verifies encryption integrity by recalculating checksum of decrypted content
 */
exports.verifyEncryption = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id).select('+path +iv');

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const isOwner = file.owner.toString() === req.user._id.toString();
    const sharedEntry = file.sharedWith.find(s => s.user?.toString() === req.user._id.toString());
    if (!isOwner && !sharedEntry) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (!fs.existsSync(file.path)) {
      return res.status(404).json({ success: false, message: 'Encrypted file not found on disk.' });
    }

    // Decrypt and hash
    const buffer = await decryptFile(file.path, file.iv);

    // Write temp file for checksum
    const tmpPath = path.join(uploadDir, `verify_${uuidv4()}`);
    fs.writeFileSync(tmpPath, buffer);
    const currentChecksum = await generateChecksum(tmpPath);
    fs.unlinkSync(tmpPath);

    const intact = currentChecksum === file.checksum;

    res.json({
      success: true,
      data: {
        intact,
        storedChecksum: file.checksum,
        currentChecksum,
        encryptionType: file.encryptionType || 'AES-256-CBC',
        message: intact ? 'File integrity verified — encryption intact.' : 'Warning: checksum mismatch detected.',
      },
    });
  } catch (error) {
    next(error);
  }
};
