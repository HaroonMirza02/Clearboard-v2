
// Local storage helper (using local filesystem instead of GCS)
const fs = require('fs');
const path = require('path');
const stream = require('stream');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

console.log('Using local storage in:', UPLOADS_DIR);

function getLocalPath(filename) {
  return path.join(UPLOADS_DIR, filename);
}

// Upload a buffer to local storage
function uploadToGCS(filename, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const fullPath = getLocalPath(filename);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFile(fullPath, buffer, (err) => {
      if (err) return reject(err);
      resolve(filename);
    });
  });
}

// Get a download stream from local storage
function getGCSDownloadStream(filename) {
  const fullPath = getLocalPath(filename);
  return fs.createReadStream(fullPath);
}

// Get a "signed URL" (locally just a direct URL or local path)
// In a real local setup, this might be a path that the express app serves as static
function getSignedUrl(filename, expiresInMinutes = 15) {
  // For local development, we return a URL that the server can serve
  // We'll assume the server serves 'uploads' at '/api/files/download-local/:filename'
  // Or just return a placeholder for now
  return Promise.resolve(`/api/files/download-raw/${filename}`);
}

// Get file metadata
async function getFileMetadata(filename) {
  const fullPath = getLocalPath(filename);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${filename}`);
  }
  const stats = fs.statSync(fullPath);
  return {
    size: stats.size,
    contentType: 'application/octet-stream', // Could use mime-types package
    timeCreated: stats.birthtime,
    updated: stats.mtime
  };
}

async function deleteFromGCS(gcsObjectKey) {
  const fullPath = getLocalPath(gcsObjectKey);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
  return true;
}

// Create a write stream to local storage
function createGCSWriteStream(filename, contentType, opts = {}) {
  const fullPath = getLocalPath(filename);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return fs.createWriteStream(fullPath);
}

module.exports = {
  uploadToGCS,
  getGCSDownloadStream,
  getSignedUrl,
  createGCSWriteStream,
  getFileMetadata,
  deleteFromGCS
};
