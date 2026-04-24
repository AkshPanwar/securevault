const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN', 'LOGOUT', 'SIGNUP', 'PASSWORD_CHANGE',
      'FILE_UPLOAD', 'FILE_DOWNLOAD', 'FILE_DELETE', 'FILE_RESTORE',
      'FILE_SHARE', 'FILE_UNSHARE', 'FILE_VIEW', 'FILE_EDIT',
      '2FA_ENABLE', '2FA_DISABLE', '2FA_VERIFY',
      'FAILED_LOGIN', 'ACCOUNT_LOCKED',
    ],
  },
  resource: {
    type: String,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '90d' }, // Auto-delete after 90 days
  },
});

auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ action: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
