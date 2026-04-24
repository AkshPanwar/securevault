const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'File name is required'],
    trim: true,
    maxlength: 255,
  },
  originalName: {
    type: String,
    required: true,
  },
  encryptedName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  encryptedSize: {
    type: Number,
    default: 0,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  path: {
    type: String,
    required: true,
    select: false,
  },
  isEncrypted: {
    type: Boolean,
    default: true,
  },
  iv: {
    type: String,
    select: false,
  },
  checksum: {
    type: String,
  },
  // Security scoring
  securityScore: {
    type: Number,
    default: null,
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', null],
    default: null,
  },
  encryptionType: {
    type: String,
    default: 'AES-256-CBC',
  },
  // Content editing for text files
  isTextEditable: {
    type: Boolean,
    default: false,
  },
  contentVersions: [{
    version: Number,
    checksum: String,
    size: Number,
    editedAt: { type: Date, default: Date.now },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  tags: [String],
  description: {
    type: String,
    maxlength: 500,
  },
  folder: {
    type: String,
    default: 'root',
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: Date,
  isStarred: {
    type: Boolean,
    default: false,
  },
  downloadCount: {
    type: Number,
    default: 0,
  },
  lastAccessed: Date,
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    permission: {
      type: String,
      enum: ['view', 'edit', 'download'],
      default: 'view',
    },
    sharedAt: {
      type: Date,
      default: Date.now,
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  publicLink: {
    enabled: { type: Boolean, default: false },
    token: String,
    expiresAt: Date,
    password: { type: String, select: false },
    downloadLimit: Number,
    downloadCount: { type: Number, default: 0 },
  },
  versions: [{
    version: Number,
    encryptedName: String,
    path: { type: String, select: false },
    size: Number,
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }],
  malwareScanStatus: {
    type: String,
    enum: ['pending', 'clean', 'suspicious', 'blocked'],
    default: 'pending',
  },
  malwareScanDetails: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

fileSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

fileSchema.index({ owner: 1, isDeleted: 1 });
fileSchema.index({ 'sharedWith.user': 1 });
fileSchema.index({ encryptedName: 1 });
fileSchema.index({ createdAt: -1 });

// Safe file object
fileSchema.methods.toSafeObject = function () {
  return {
    _id: this._id,
    name: this.name,
    originalName: this.originalName,
    mimeType: this.mimeType,
    size: this.size,
    owner: this.owner,
    tags: this.tags,
    description: this.description,
    folder: this.folder,
    isDeleted: this.isDeleted,
    isStarred: this.isStarred,
    downloadCount: this.downloadCount,
    lastAccessed: this.lastAccessed,
    sharedWith: this.sharedWith,
    publicLink: {
      enabled: this.publicLink?.enabled,
      token: this.publicLink?.token,
      expiresAt: this.publicLink?.expiresAt,
    },
    malwareScanStatus: this.malwareScanStatus,
    isEncrypted: this.isEncrypted,
    encryptionType: this.encryptionType || 'AES-256-CBC',
    checksum: this.checksum,
    encryptedSize: this.encryptedSize,
    securityScore: this.securityScore,
    riskLevel: this.riskLevel,
    isTextEditable: this.isTextEditable,
    contentVersions: this.contentVersions || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('File', fileSchema);
