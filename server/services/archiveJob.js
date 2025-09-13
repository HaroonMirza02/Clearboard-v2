const FileVersion = require('../models/FileVersion');
const { createZipStream, createBrotliStream } = require('./compression');
const { uploadStreamToS3 } = require('./s3');
const mongoose = require('mongoose');

// Archive job: compress and archive files not accessed for >10 days
module.exports = function startArchiveJob() {
  setInterval(async () => {
    try {
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const candidates = await FileVersion.find({ status: 'stored', lastAccessedAt: { $lt: tenDaysAgo } });
      for (const version of candidates) {
        // Choose compression type (zip by default)
        const compressType = 'zip';
        // Simulate file stream retrieval (in real app, stream from S3)
        // Here, just skip actual download for brevity
        const fakeStream = require('stream').Readable.from('ARCHIVE_PLACEHOLDER');
        let stream, contentType;
        if (compressType === 'zip') {
          stream = createZipStream({ stream: fakeStream, originalname: 'archive' });
          contentType = 'application/zip';
        } else {
          stream = fakeStream.pipe(createBrotliStream());
          contentType = 'application/x-brotli';
        }
        const archiveKey = version.objectKey + '.archive.' + compressType;
        const s3Stream = await uploadStreamToS3(archiveKey, contentType);
        stream.pipe(s3Stream);
        s3Stream.on('finish', async () => {
          version.status = 'archived';
          await version.save();
        });
      }
    } catch (err) {
      console.error('Archive job error:', err);
    }
  }, 24 * 60 * 60 * 1000); // Run daily
};
