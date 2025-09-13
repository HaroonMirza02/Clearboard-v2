// GridFS helper for MongoDB Atlas
const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');

function getGridFSBucket() {
  return new GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
}

// Upload a buffer to GridFS
function uploadToGridFS(filename, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const bucket = getGridFSBucket();
    const uploadStream = bucket.openUploadStream(filename, { contentType });
    uploadStream.end(buffer, () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
  });
}

// Download from GridFS
function getGridFSDownloadStream(fileId) {
  const bucket = getGridFSBucket();
  return bucket.openDownloadStream(fileId);
}

module.exports = { uploadToGridFS, getGridFSDownloadStream };
