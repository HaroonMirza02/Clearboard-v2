const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
  category: { type: String, enum: ['research', 'NA', 'CA', 'source', 'docs', 'legal', 'finance'], required: true },
  status: {
    type: String,
    enum: ['draft', 'approved', 'archived'],
    default: 'draft'
  },
  hash: { type: String }, // To prevent duplicate uploads
  size: { type: Number },
  mimeType: { type: String },
  isShared: { type: Boolean, default: false },
  sharedWithTeams: [{ type: String, enum: ['softdev', 'busdev', 'admin', 'hr', 'ops'] }],
  sharedAt: { type: Date },
  sharedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  fileCreatedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
