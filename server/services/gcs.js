
// Google Cloud Storage helper
const { Storage } = require('@google-cloud/storage');
const stream = require('stream');
const BUCKET_NAME = process.env.GCS_BUCKET_NAME;

// Initialize storage with credentials from environment variables
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'clearboard';

console.log('Using GCS bucket:', bucketName);

// Get bucket reference
function getBucket() {
  return storage.bucket(bucketName);
}

// Upload a buffer to GCS
function uploadToGCS(filename, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const bucket = getBucket();
    const file = bucket.file(filename);
    const options = {
      contentType,
      metadata: {
        contentType,
      }
    };

    const bufferStream = new stream.PassThrough();
    bufferStream.end(buffer);
    
    bufferStream
      .pipe(file.createWriteStream(options))
      .on('error', reject)
      .on('finish', () => {
        resolve(filename);
      });
  });
}

// Get a download stream from GCS
function getGCSDownloadStream(filename) {
  const bucket = getBucket();
  const file = bucket.file(filename);
  return file.createReadStream();
}

// Get a signed URL for direct browser download
function getSignedUrl(filename, expiresInMinutes = 15) {
  const bucket = getBucket();
  const file = bucket.file(filename);
  
  return file.getSignedUrl({
    action: 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000
  }).then(urls => urls[0]);
}

// Get file metadata including size
async function getFileMetadata(filename) {
  const bucket = getBucket();
  const file = bucket.file(filename);
  const [metadata] = await file.getMetadata();
  return {
    size: parseInt(metadata.size, 10),
    contentType: metadata.contentType,
    timeCreated: metadata.timeCreated,
    updated: metadata.updated
  };
}

async function deleteFromGCS(gcsObjectKey) {
  try {
    await storage.bucket(BUCKET_NAME).file(gcsObjectKey).delete();
    console.log(`Successfully deleted gs://${BUCKET_NAME}/${gcsObjectKey}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete file from GCS: ${gcsObjectKey}`, error);
    // Don't throw if the file doesn't exist (code 404)
    if (error.code === 404) {
      console.warn('File was already deleted or not found in GCS.');
      return true;
    }
    throw error;
  }
}

// Create a write stream to GCS
function createGCSWriteStream(filename, contentType) {
  const bucket = getBucket();
  const file = bucket.file(filename);
  return file.createWriteStream({
    contentType,
    resumable: false
  });
}

module.exports = { 
  uploadToGCS, 
  getGCSDownloadStream, 
  getSignedUrl,
  createGCSWriteStream,
  getFileMetadata,
    deleteFromGCS
};