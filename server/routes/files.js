
/**
 * @swagger
 * /api/files:
 *   get:
 *     summary: List all files with latest version
 *     tags:
 *       - Files
 *     responses:
 *       200:
 *         description: List of files
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   category:
 *                     type: string
 *                   createdAt:
 *                     type: string
 *                   updatedAt:
 *                     type: string
 *                   latestVersion:
 *                     type: object
 *                     properties:
 *                       versionNumber:
 *                         type: number
 *                       size:
 *                         type: number
 *                       contentType:
 *                         type: string
 *                       uploadedAt:
 *                         type: string
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const File = require('../models/File');
const FileVersion = require('../models/FileVersion');
const auth = require('../middleware/auth');
const { createZipStream, createBrotliStream } = require('../services/compression');
const crypto = require('crypto');
const upload = multer();


// List all files with latest version (including shared files for authenticated users)
router.get('/', auth, async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Get user's team information
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Build query to get user's own files and files shared with their team
    const query = {
      $or: [
        { ownerId: userId }, // User's own files
        {
          isShared: true,
          sharedWithTeams: { $in: [user.team] } // Files shared with user's team
        }
      ]
    };

    // If user is admin, show all files
    if (user.role === 'admin') {
      const files = await File.find();
      const fileList = await Promise.all(files.map(async (file) => {
        const latestVersion = await FileVersion.findOne({ fileId: file._id, status: 'stored' }).sort({ versionNumber: -1 });
        return {
          id: file._id,
          name: file.name,
          category: file.category,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          isShared: file.isShared,
          sharedWithTeams: file.sharedWithTeams,
          sharedAt: file.sharedAt,
          isOwner: file.ownerId && file.ownerId.equals(userId),
          latestVersion: latestVersion ? {
            versionNumber: latestVersion.versionNumber,
            size: latestVersion.size,
            contentType: latestVersion.contentType,
            uploadedAt: latestVersion.createdAt
          } : null
        };
      }));
      return res.json(fileList);
    }

    // Get files based on query
    const files = await File.find(query);

    // For each file, get the latest version
    const fileList = await Promise.all(files.map(async (file) => {
      const latestVersion = await FileVersion.findOne({ fileId: file._id, status: 'stored' }).sort({ versionNumber: -1 });
      return {
        id: file._id,
        name: file.name,
        category: file.category,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        isShared: file.isShared,
        sharedWithTeams: file.sharedWithTeams,
        sharedAt: file.sharedAt,
        isOwner: file.ownerId && file.ownerId.equals(userId),
        latestVersion: latestVersion ? {
          versionNumber: latestVersion.versionNumber,
          size: latestVersion.size,
          contentType: latestVersion.contentType,
          uploadedAt: latestVersion.createdAt
        } : null
      };
    }));
    res.json(fileList);
  } catch (err) {
    next(err);
  }
});



/**
 * @swagger
 * /api/files/upload:
 *   post:
 *     summary: Upload a file (with optional compression)
 *     tags:
 *       - Files
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               filename:
 *                 type: string
 *               contentType:
 *                 type: string
 *               size:
 *                 type: number
 *               category:
 *                 type: string
 *               compress:
 *                 type: string
 *                 enum: [none, zip, brotli]
 *     responses:
 *       200:
 *         description: Upload complete
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 fileId:
 *                   type: string
 */
const { uploadToGCS } = require('../services/gcs');
router.post('/upload', auth, upload.single('file'), async (req, res, next) => {
  try {
    const { filename, contentType, size, category, compress = 'zip' } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    // Find or create File with user context
    let file = await File.findOne({ name: filename, ownerId: req.user._id });
    if (!file) {
      file = await File.create({ name: filename, ownerId: req.user._id, category });
    }
    const versionNumber = await FileVersion.countDocuments({ fileId: file._id }) + 1;
    // Upload to GCS
    const objectKey = `${file._id}/v${versionNumber}/${filename}`;
    await uploadToGCS(objectKey, req.file.buffer, contentType);
    const checksum = require('crypto').createHash('sha256').update(req.file.buffer).digest('hex');
    await FileVersion.create({
      fileId: file._id,
      versionNumber,
      provider: 'gcs',
      objectKey: objectKey,
      size: req.file.size,
      contentType,
      checksum,
      uploadedBy: req.user._id,
      status: 'stored'
    });
    res.json({ message: 'Upload complete', fileId: file._id });
  } catch (err) {
    next(err);
  }
});

// Initiate upload
router.post('/initiate', auth, upload.single('file'), async (req, res, next) => {
  try {
    const { filename, contentType, size, category, projectId, checksum, compress = 'none' } = req.body;
    let file = await File.findOne({ name: filename, ownerId: req.user._id });
    if (!file) {
      file = await File.create({ name: filename, ownerId: req.user._id, category, projectId });
    }
    const versionNumber = await FileVersion.countDocuments({ fileId: file._id }) + 1;
    const objectKey = `${file._id}/v${versionNumber}/${filename}${compress !== 'none' ? '.' + compress : ''}`;
    let uploadUrl, method = 'presigned';
    if (compress === 'none') {
      uploadUrl = await getPresignedUploadUrl(objectKey, contentType);
    } else {
      method = 'server';
    }
    const fileVersion = await FileVersion.create({
      fileId: file._id,
      versionNumber,
      provider: 'aws_s3',
      objectKey,
      size,
      contentType,
      checksum,
      uploadedBy: req.user._id,
      status: 'initiated'
    });
    res.json({
      fileId: file._id,
      versionId: fileVersion._id,
      upload: {
        method,
        provider: 'aws_s3',
        uploadUrl: uploadUrl || null,
        expiresIn: 900
      },
      metadata: {
        filename,
        versionNumber,
        status: 'initiated',
        category
      }
    });
  } catch (err) {
    next(err);
  }
});

// Server-side upload with compression
router.post('/upload/:fileId/:versionId', auth, upload.single('file'), async (req, res, next) => {
  try {
    const { compress = 'none' } = req.body;
    const { fileId, versionId } = req.params;
    const fileVersion = await FileVersion.findById(versionId);
    if (!fileVersion || !fileVersion.fileId.equals(fileId)) return res.status(404).json({ message: 'FileVersion not found' });
    let stream = req.file.stream;
    let contentType = fileVersion.contentType;
    if (compress === 'zip') {
      stream = createZipStream(req.file);
      contentType = 'application/zip';
    } else if (compress === 'brotli') {
      stream = stream.pipe(createBrotliStream());
      contentType = 'application/x-brotli';
    }
    const s3Stream = await uploadStreamToS3(fileVersion.objectKey, contentType);
    stream.pipe(s3Stream);
    s3Stream.on('finish', async () => {
      fileVersion.status = 'stored';
      fileVersion.size = req.file.size;
      fileVersion.save();
      res.json({ message: 'Upload complete' });
    });
    s3Stream.on('error', next);
  } catch (err) {
    next(err);
  }
});

// Complete upload
router.post('/complete/:fileId', auth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const fileVersion = await FileVersion.findOne({ fileId }).sort({ versionNumber: -1 });
    if (!fileVersion) return res.status(404).json({ message: 'FileVersion not found' });
    // Optionally verify checksum/etag here
    fileVersion.status = 'stored';
    await fileVersion.save();
    res.json({ message: 'File upload completed', versionId: fileVersion._id });
  } catch (err) {
    next(err);
  }
});

// Download file
router.get('/download/:fileId', auth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const fileVersion = await FileVersion.findOne({ fileId, status: 'stored' }).sort({ versionNumber: -1 });
    if (!fileVersion) return res.status(404).json({ message: 'File not found' });
    fileVersion.lastAccessedAt = new Date();
    await fileVersion.save();

    // Use GCS signed URL for download
    const { getSignedUrl } = require('../services/gcs');
    const url = await getSignedUrl(fileVersion.objectKey);
    res.json({ url });
  } catch (err) {
    next(err);
  }
});

// Share file with team
router.post('/share/:fileId', auth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    // Get user's team information
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user || !user.team) {
      return res.status(400).json({ message: 'User team information not found' });
    }

    // Find the file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user owns the file or has admin role
    if (!file.ownerId.equals(userId) && user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only share files you own' });
    }

    // Update file sharing status
    file.isShared = true;
    file.sharedWithTeams = [user.team];
    file.sharedAt = new Date();
    file.sharedBy = userId;
    file.updatedAt = new Date();

    await file.save();

    res.json({
      message: `File shared successfully with ${user.team} team members`,
      fileId: file._id,
      sharedWithTeams: file.sharedWithTeams
    });
  } catch (err) {
    next(err);
  }
});

// Unshare file (remove sharing)
router.post('/unshare/:fileId', auth, async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const userId = req.user._id;

    // Get user's team information
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }

    // Find the file
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if user owns the file or has admin role
    if (!file.ownerId.equals(userId) && user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only unshare files you own' });
    }

    // Update file sharing status
    file.isShared = false;
    file.sharedWithTeams = [];
    file.sharedAt = null;
    file.sharedBy = null;
    file.updatedAt = new Date();

    await file.save();

    res.json({
      message: 'File sharing removed successfully',
      fileId: file._id
    });
  } catch (err) {
    next(err);
  }
});

// Local file download (raw)
router.get('/download-raw/*', async (req, res, next) => {
  try {
    const filename = req.params[0];
    const { getGCSDownloadStream } = require('../services/gcs');
    const stream = getGCSDownloadStream(filename);

    stream.on('error', (err) => {
      if (err.code === 'ENOENT') {
        res.status(404).json({ message: 'File not found locally' });
      } else {
        next(err);
      }
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
