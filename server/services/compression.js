const archiver = require('archiver');
const zlib = require('zlib');

// Returns a zip stream for a file
function createZipStream(filename) {
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { throw err; });
  archive.append(filename.stream, { name: filename.originalname });
  archive.finalize();
  return archive;
}

// Returns a Brotli stream for a file
function createBrotliStream() {
  return zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } });
}

module.exports = {
  createZipStream,
  createBrotliStream
};
