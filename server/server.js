require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const multer = require('multer');
const zlib = require('zlib');
const archiver = require('archiver');
const cors = require('cors');
const { uploadToGCS, getGCSDownloadStream, getSignedUrl, getFileMetadata } = require('./services/gcs');

const app = express();

// Enable CORS for frontend origins
app.use(cors({
  origin: ["https://fifth-flame-472409-q0.web.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

const upload = multer({ dest: 'uploads/' });

// Multi-user credentials
const USERS = [
  { userId: 'HaroonMirza', password: 'password123', id: 'user-1', role: 'user' },
  { userId: 'IbrahimMalik', password: 'password123', id: 'user-2', role: 'user' },
  { userId: 'ZaidBinAsim', password: 'password123', id: 'user-3', role: 'user' },
  { userId: 'MirzaUzairBaig', password: 'password123', id: 'user-4', role: 'user' },
  { userId: 'AliZakaria', password: 'admin123', id: 'admin-1', role: 'admin' }
];

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
  const user = USERS.find(u => u.userId === userId && u.password === password);
  if (user) {
    const token = jwt.sign({ id: user.id, userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, role: user.role });
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

// Upload endpoint (with optional compression)
app.post('/api/files/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { originalname, mimetype, path: tempPath } = req.file;
    const { compress = 'none', category = 'Others' } = req.body;
    const meta = loadMeta();

    // File owner is the current user
    const ownerId = req.user.id;

    // Versioning - filter by owner
    const sameGroup = Object.values(meta).filter(f => 
      f.originalname === originalname && 
      (f.category || 'Others') === category &&
      f.ownerId === ownerId
    );
    const nowIso = new Date().toISOString();
    const maxVersion = sameGroup.length ? Math.max(...sameGroup.map(f => f.version || 1)) : 0;
    const firstUploadedAt = sameGroup.length
      ? sameGroup.reduce((earliest, f) => {
          const ts = f.uploadedAt || nowIso;
          return ts < earliest ? ts : earliest;
        }, sameGroup[0].uploadedAt || nowIso)
      : nowIso;

    const version = maxVersion + 1;
    const uploadedAt = firstUploadedAt;
    const modifiedAt = version > 1 ? nowIso : null;

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    let gcsObjectKey = `files/${id}`;
    let compressionType = 'none';
    let finalMime = mimetype;
    let size = 0;

    if (compress === 'zip') {
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
      gcsObjectKey += '.zip';
      const fileBuffer = fs.readFileSync(zipPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, 'application/zip');
      const metadata = await getFileMetadata(gcsObjectKey);
      fs.unlinkSync(zipPath);
      compressionType = 'zip';
      finalMime = 'application/zip';
      size = metadata.size;
    } else if (compress === 'brotli') {
      const brotliPath = tempPath + '.br';
      await new Promise((resolve, reject) => {
        const input = fs.createReadStream(tempPath);
        const output = fs.createWriteStream(brotliPath);
        input.pipe(zlib.createBrotliCompress()).pipe(output);
        output.on('finish', resolve);
        output.on('error', reject);
      });
      fs.unlinkSync(tempPath);
      gcsObjectKey += '.br';
      const fileBuffer = fs.readFileSync(brotliPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, 'application/x-brotli');
      const metadata = await getFileMetadata(gcsObjectKey);
      fs.unlinkSync(brotliPath);
      compressionType = 'brotli';
      finalMime = 'application/x-brotli';
      size = metadata.size;
    } else {
      gcsObjectKey += path.extname(originalname);
      const fileBuffer = fs.readFileSync(tempPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, mimetype);
      const metadata = await getFileMetadata(gcsObjectKey);
      fs.unlinkSync(tempPath);
      size = metadata.size;
    }

    meta[id] = {
      id,
      originalname,
      mimetype,
      gcsObjectKey,
      storageProvider: 'gcs',
      compressionType,
      finalMime,
      category,
      version,
      uploadedAt,
      modifiedAt,
      size,
      ownerId,
      ownerUserId: req.user.userId
    };
    saveMeta(meta);
    res.json({ message: 'Upload complete', fileId: id });
  } catch (err) {
    res.status(500).json({ message: 'Upload failed', error: err.message });
  }
});

// Download endpoint
app.get('/api/files/download/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const meta = loadMeta();
    const file = meta[fileId];
    if (!file) return res.status(404).json({ message: 'File not found' });

    // Authorization check
    if (req.user.role !== 'admin' && file.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype);

    const readStream = getGCSDownloadStream(file.gcsObjectKey);

    readStream.on('error', err => {
      console.error('GCS read error:', err);
      res.status(500).json({ message: 'File read error', error: err.message });
    });

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
      readStream.pipe(res);
    }
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

// List files endpoint
app.get('/api/files', auth, async (req, res) => {
  try {
    const meta = loadMeta();
    const isAdmin = req.user.role === 'admin';
    
    // Filter files based on user role
    const userFiles = Object.values(meta).filter(f => 
      isAdmin || f.ownerId === req.user.id
    );

    const groups = {};
    userFiles.forEach(f => {
      const key = `${f.originalname}||${f.category || 'Others'}||${f.ownerId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });

    const files = await Promise.all(
      Object.values(groups).map(async arr => {
        arr.sort((a, b) => (b.version || 1) - (a.version || 1));
        const latest = arr[0];
        const ext = latest.originalname.includes('.') ? latest.originalname.split('.').pop() : '';
        const name = latest.originalname.replace(new RegExp(`\\.${ext}$`), '');

        let size = 0;
        if (latest.storageProvider === 'gcs' && latest.gcsObjectKey) {
          try {
            const metadata = await getFileMetadata(latest.gcsObjectKey);
            size = metadata.size;
          } catch (err) {
            console.error('Error fetching GCS metadata:', err);
          }
        }

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
          storageProvider: latest.storageProvider || 'local',
          ownerUserId: latest.ownerUserId || 'unknown'
        };
      })
    );

    res.json(files);
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ message: 'List failed', error: err.message });
  }
});

// Download a specific version by number
app.get('/api/files/download/:fileKey/version/:version', auth, async (req, res) => {
  const { fileKey, version } = req.params;
  const meta = loadMeta();
  const all = Object.values(meta);
  const current = all.find(f => f.id === fileKey);
  if (!current) return res.status(404).json({ message: 'File not found' });
  
  // Authorization check
  if (req.user.role !== 'admin' && current.ownerId !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const group = all.filter(f => 
    f.originalname === current.originalname && 
    (f.category || 'Others') === (current.category || 'Others') &&
    f.ownerId === current.ownerId
  );
  const target = group.find(f => (f.version || 1) === Number(version));
  if (!target) return res.status(404).json({ message: 'Requested version not found' });
  res.redirect(`/api/files/download/${target.id}`);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});