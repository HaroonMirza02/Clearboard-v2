const mongoose = require('mongoose');

const fileVersionSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  versionNumber: { type: Number, required: true },
  provider: { type: String, default: 'aws_s3' },
  objectKey: { type: String, required: true },
  size: { type: Number, required: true },
  contentType: { type: String, required: true },
  checksum: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  createdAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['initiated', 'stored', 'deleted', 'archived'], default: 'initiated' },
  lastAccessedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FileVersion', fileVersionSchema);
