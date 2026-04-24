const File = require('../models/File');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { v4: uuidv4 } = require('uuid');

/**
 * POST /api/shares/:fileId/share
 */
exports.shareFile = async (req, res, next) => {
  try {
    const { email, permission } = req.body;
    const file = await File.findById(req.params.fileId);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can share files.' });
    }

    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot share with yourself.' });
    }

    // Check if already shared
    const existingShare = file.sharedWith.find(
      s => s.user?.toString() === targetUser._id.toString()
    );

    if (existingShare) {
      existingShare.permission = permission;
    } else {
      file.sharedWith.push({
        user: targetUser._id,
        permission,
        sharedBy: req.user._id,
      });
    }

    await file.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'FILE_SHARE',
      resource: 'File',
      resourceId: file._id,
      details: { sharedWith: email, permission },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const populated = await File.findById(file._id)
      .populate('sharedWith.user', 'name email avatar');

    res.json({
      success: true,
      message: `File shared with ${targetUser.name}.`,
      data: { file: populated.toSafeObject() },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/shares/:fileId/share/:userId
 */
exports.unshareFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can manage shares.' });
    }

    file.sharedWith = file.sharedWith.filter(
      s => s.user?.toString() !== req.params.userId
    );

    await file.save();

    await AuditLog.create({
      user: req.user._id,
      action: 'FILE_UNSHARE',
      resource: 'File',
      resourceId: file._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({ success: true, message: 'Access revoked.' });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/shares/:fileId/public-link
 */
exports.createPublicLink = async (req, res, next) => {
  try {
    const { expiresIn, downloadLimit } = req.body;
    const file = await File.findById(req.params.fileId);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can create public links.' });
    }

    const token = uuidv4();
    const expiresAt = expiresIn
      ? new Date(Date.now() + parseInt(expiresIn) * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    file.publicLink = {
      enabled: true,
      token,
      expiresAt,
      downloadLimit: downloadLimit || null,
      downloadCount: 0,
    };

    await file.save();

    const link = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/${token}`;

    res.json({
      success: true,
      data: { link, token, expiresAt },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/shares/:fileId/public-link
 */
exports.revokePublicLink = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file || file.isDeleted) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the owner can revoke links.' });
    }

    file.publicLink = { enabled: false };
    await file.save();

    res.json({ success: true, message: 'Public link revoked.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/shares/public/:token
 */
exports.getPublicFile = async (req, res, next) => {
  try {
    const file = await File.findOne({
      'publicLink.token': req.params.token,
      'publicLink.enabled': true,
      isDeleted: false,
    }).populate('owner', 'name email');

    if (!file) {
      return res.status(404).json({ success: false, message: 'Link not found or expired.' });
    }

    if (file.publicLink.expiresAt && file.publicLink.expiresAt < new Date()) {
      return res.status(410).json({ success: false, message: 'This link has expired.' });
    }

    if (file.publicLink.downloadLimit && file.publicLink.downloadCount >= file.publicLink.downloadLimit) {
      return res.status(410).json({ success: false, message: 'Download limit reached.' });
    }

    res.json({
      success: true,
      data: {
        file: {
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          owner: file.owner,
          createdAt: file.createdAt,
        },
        token: req.params.token,
      },
    });
  } catch (error) {
    next(error);
  }
};
