const express = require('express');
const router = express.Router();
const FileVersion = require('../models/FileVersion');
const auth = require('../middleware/auth');

// Admin-only: fetch archive metadata
router.get('/:id', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const version = await FileVersion.findById(req.params.id);
    if (!version || version.status !== 'archived') return res.status(404).json({ message: 'Archive not found' });
    res.json({
      id: version._id,
      fileId: version.fileId,
      versionNumber: version.versionNumber,
      objectKey: version.objectKey,
      size: version.size,
      status: version.status,
      createdAt: version.createdAt,
      lastAccessedAt: version.lastAccessedAt
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
