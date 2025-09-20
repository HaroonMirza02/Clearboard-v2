require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const multer = require('multer');
const zlib = require('zlib');
const archiver = require('archiver');
const { uploadToGCS, getGCSDownloadStream, getSignedUrl } = require('./services/gcs');

const app = express();
app.use(express.json());
app.use(morgan('dev'));

const upload = multer({ dest: 'uploads/' });

// Hardcoded credentials and secret
const DEMO_USER = { userId: 'demo', password: 'password123', id: 'demo-user-1' };
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Metadata file
const META_PATH = path.join(__dirname, 'uploads', 'filemeta.json');
function loadMeta() {
  if (!fs.existsSync(META_PATH)) return {};
  return JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
}
function saveMeta(meta) {
  fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2));
}

// Login endpoint (returns JWT)
app.post('/api/login', (req, res) => {
  const { userId, password } = req.body;
  if (userId === DEMO_USER.userId && password === DEMO_USER.password) {
    const token = jwt.sign({ id: DEMO_USER.id, userId: DEMO_USER.userId }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token });
  }
  res.status(401).json({ message: 'Invalid credentials' });
});

// JWT auth middleware
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// GCS service is already imported at the top of the file

// Upload endpoint (with optional compression)
app.post('/api/files/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { originalname, mimetype, path: tempPath } = req.file;
    const { compress = 'none', category = 'Others' } = req.body;
    const meta = loadMeta();

    // Compute versioning based on all existing entries with same name+category
    const sameGroup = Object.values(meta).filter(f => f.originalname === originalname && (f.category || 'Others') === category);
    const nowIso = new Date().toISOString();
    const maxVersion = sameGroup.length ? Math.max(...sameGroup.map(f => f.version || 1)) : 0;
    const firstUploadedAt = sameGroup.length
      ? sameGroup.reduce((earliest, f) => {
          const ts = f.uploadedAt || nowIso;
          return ts < earliest ? ts : earliest;
        }, sameGroup[0].uploadedAt || nowIso)
      : nowIso;

    const version = maxVersion + 1;
    const uploadedAt = firstUploadedAt; // preserve earliest
    const modifiedAt = version > 1 ? nowIso : null;

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    let gcsObjectKey = `files/${id}`;
    let compressionType = 'none';
    let finalMime = mimetype;
    
    if (compress === 'zip') {
      // Compress to zip
      const zipPath = tempPath + '.zip';
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip');
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.file(tempPath, { name: originalname });
        archive.finalize();
      });
      fs.unlinkSync(tempPath);
      
      // Upload to GCS
      gcsObjectKey += '.zip';
      const fileBuffer = fs.readFileSync(zipPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, 'application/zip');
      fs.unlinkSync(zipPath); // Clean up local file
      
      compressionType = 'zip';
      finalMime = 'application/zip';
    } else if (compress === 'brotli') {
      // Compress to brotli
      const brotliPath = tempPath + '.br';
      await new Promise((resolve, reject) => {
        const input = fs.createReadStream(tempPath);
        const output = fs.createWriteStream(brotliPath);
        input.pipe(zlib.createBrotliCompress()).pipe(output);
        output.on('finish', resolve);
        output.on('error', reject);
      });
      fs.unlinkSync(tempPath);
      
      // Upload to GCS
      gcsObjectKey += '.br';
      const fileBuffer = fs.readFileSync(brotliPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, 'application/x-brotli');
      fs.unlinkSync(brotliPath); // Clean up local file
      
      compressionType = 'brotli';
      finalMime = 'application/x-brotli';
    } else {
      // No compression, just upload directly
      gcsObjectKey += path.extname(originalname);
      const fileBuffer = fs.readFileSync(tempPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, mimetype);
      fs.unlinkSync(tempPath); // Clean up local file
    }

    // Save new file version entry
    meta[id] = {
      id,
      originalname,
      mimetype,
      gcsObjectKey, // Store GCS object key instead of local path
      storageProvider: 'gcs', // Mark as stored in GCS
      compressionType,
      finalMime,
      category,
      version,
      uploadedAt,
      modifiedAt
    };
    saveMeta(meta);
    res.json({ message: 'Upload complete', fileId: id });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// Download endpoint (using GCS and handling decompression)
app.get('/api/files/download/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const meta = loadMeta();
    const file = meta[fileId];
    
    if (!file) return res.status(404).json({ message: 'File not found' });
    
    // Set appropriate headers for download
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype);
    
    // Get download stream from GCS
  const readStream = getGCSDownloadStream(file.gcsObjectKey);

    
    readStream.on('error', (err) => {
      console.error('GCS read error:', err);
      res.status(500).json({ message: 'File read error', error: err.message });
    });
    
    // Handle decompression based on compression type
    if (file.compressionType === 'zip') {
      const unzipper = require('unzipper');
      const unzipStream = readStream.pipe(unzipper.ParseOne());
      unzipStream.on('error', err => {
        console.error('Zip decompression error:', err);
        res.status(500).json({ message: 'Decompression error', error: err.message });
      });
      unzipStream.pipe(res);
    } else if (file.compressionType === 'brotli') {
      const brotliStream = readStream.pipe(zlib.createBrotliDecompress());
      brotliStream.on('error', err => {
        console.error('Brotli decompression error:', err);
        res.status(500).json({ message: 'Decompression error', error: err.message });
      });
      brotliStream.pipe(res);
    } else {
      // No compression, just pipe the file directly
      readStream.pipe(res);
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

// List files (for testing/demo)
app.get('/api/files', auth, (req, res) => {
  const meta = loadMeta();
  // Group by (name, category)
  const groups = {};
  Object.values(meta).forEach(f => {
    const key = `${f.originalname}||${f.category || 'Others'}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  });
  // For each group, pick latest for row and attach history
  const files = Object.values(groups).map(arr => {
    arr.sort((a, b) => (b.version || 1) - (a.version || 1));
    const latest = arr[0];
    const ext = latest.originalname.includes('.') ? latest.originalname.split('.').pop() : '';
    const name = latest.originalname.replace(new RegExp(`\.${ext}$`), '');
    
    // Size is not available directly from metadata for GCS files
    // We'll use a placeholder size for now
    const size = 0;
    
    return {
      id: latest.id,
      name,
      fileType: ext,
      size: (size / 1024).toFixed(1),
      compressionType: latest.compressionType,
      category: latest.category || 'Others',
      version: latest.version || 1,
      uploadedAt: latest.uploadedAt,
      modifiedAt: latest.modifiedAt,
      versions: arr.map(v => ({ version: v.version || 1, id: v.id })),
      download: `/api/files/download/${latest.id}`,
      storageProvider: latest.storageProvider || 'local'
    };
  });
  res.json(files);
});

// Download a specific version by number
app.get('/api/files/download/:fileKey/version/:version', auth, async (req, res) => {
  const { fileKey, version } = req.params;
  const meta = loadMeta();
  // fileKey can be an id or a latest id; we search by matching group of that id
  const all = Object.values(meta);
  const current = all.find(f => f.id === fileKey) || all.find(f => f.id === fileKey);
  if (!current) return res.status(404).json({ message: 'File not found' });
  const group = all.filter(f => f.originalname === current.originalname && (f.category || 'Others') === (current.category || 'Others'));
  const target = group.find(f => (f.version || 1) === Number(version));
  if (!target) return res.status(404).json({ message: 'Requested version not found' });
  res.redirect(`/api/files/download/${target.id}`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  // No demo JWT or error logging
  // Server running
});
