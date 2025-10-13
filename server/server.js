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
const bcrypt = require('bcrypt');
const { uploadToGCS, getGCSDownloadStream, getSignedUrl, getFileMetadata } = require('./services/gcs');

const app = express();

// Enable CORS for frontend origins
app.use(cors({
  origin: [
    "https://fifth-flame-472409-q0.web.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

// Ensure uploads directory exists (for temporary files only)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({ dest: UPLOADS_DIR });

// Hardcoded users (legacy)
const HARDCODED_USERS = [
  { userId: 'HaroonMirza', password: 'password123', id: 'user-1', role: 'user' },
  { userId: 'IbrahimMalik', password: 'password123', id: 'user-2', role: 'user' },
  { userId: 'ZaidBinAsim', password: 'password123', id: 'user-3', role: 'user' },
  { userId: 'MirzaUzairBaig', password: 'password123', id: 'user-4', role: 'user' },
  { userId: 'AliZakaria', password: 'admin123', id: 'admin-1', role: 'admin' }
];

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

// Cloud-based metadata storage keys
const META_GCS_KEY = 'metadata/filemeta.json';
const USERS_GCS_KEY = 'metadata/users.json';

// Load metadata from GCS
async function loadMeta() {
  try {
    const stream = getGCSDownloadStream(META_GCS_KEY);
    const chunks = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const data = Buffer.concat(chunks).toString('utf8');
    console.log('Metadata loaded from GCS');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 404 || err.message.includes('not found') || err.message.includes('No such object')) {
      console.log('Creating new filemeta.json in GCS');
      await saveMeta({});
      return {};
    }
    console.error('Error loading metadata from GCS:', err);
    return {};
  }
}

// Save metadata to GCS
async function saveMeta(meta) {
  try {
    const jsonString = JSON.stringify(meta, null, 2);
    const buffer = Buffer.from(jsonString, 'utf8');
    await uploadToGCS(META_GCS_KEY, buffer, 'application/json');
    console.log('Metadata saved to GCS successfully');
  } catch (err) {
    console.error('Error saving metadata to GCS:', err);
    throw err;
  }
}

// Load users from GCS
async function loadUsers() {
  try {
    const stream = getGCSDownloadStream(USERS_GCS_KEY);
    const chunks = [];
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const data = Buffer.concat(chunks).toString('utf8');
    console.log('Users loaded from GCS');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 404 || err.message.includes('not found') || err.message.includes('No such object')) {
      console.log('Creating new users.json in GCS');
      await saveUsers([]);
      return [];
    }
    console.error('Error loading users from GCS:', err);
    return [];
  }
}

// Save users to GCS
async function saveUsers(users) {
  try {
    const jsonString = JSON.stringify(users, null, 2);
    const buffer = Buffer.from(jsonString, 'utf8');
    await uploadToGCS(USERS_GCS_KEY, buffer, 'application/json');
    console.log('Users saved to GCS successfully');
  } catch (err) {
    console.error('Error saving users to GCS:', err);
    throw err;
  }
}

// Get all users (hardcoded + registered)
async function getAllUsers() {
  const registeredUsers = await loadUsers();
  return [...HARDCODED_USERS, ...registeredUsers];
}

// Signup endpoint
app.post('/api/signup', async (req, res) => {
  try {
    const { userId, password, email } = req.body;

    // Validation
    if (!userId || !password) {
      return res.status(400).json({ message: 'User ID and password are required' });
    }

    if (userId.length < 3) {
      return res.status(400).json({ message: 'User ID must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    // Check if user already exists
    const allUsers = await getAllUsers();
    const existingUser = allUsers.find(u => u.userId.toLowerCase() === userId.toLowerCase());
    
    if (existingUser) {
      return res.status(409).json({ message: 'User ID already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique ID
    const id = 'user-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    // Create new user
    const newUser = {
      userId,
      password: hashedPassword,
      email: email || null,
      id,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    // Save to registered users
    const registeredUsers = await loadUsers();
    registeredUsers.push(newUser);
    await saveUsers(registeredUsers);

    console.log(`New user registered: ${userId} (${id})`);

    // Generate token
    const token = jwt.sign({ id: newUser.id, userId: newUser.userId, role: newUser.role }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'User registered successfully',
      token, 
      role: newUser.role,
      userId: newUser.userId
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

// Login endpoint (returns JWT)
app.post('/api/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ message: 'User ID and password are required' });
    }

    const allUsers = await getAllUsers();
    const user = allUsers.find(u => u.userId === userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    let isValidPassword = false;
    
    // For hardcoded users (plain text passwords)
    if (HARDCODED_USERS.some(u => u.userId === userId)) {
      isValidPassword = user.password === password;
    } else {
      // For registered users (hashed passwords)
      isValidPassword = await bcrypt.compare(password, user.password);
    }

    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, userId: user.userId, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    
    console.log(`User logged in: ${userId} (${user.role})`);
    
    res.json({ token, role: user.role, userId: user.userId });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
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
  let tempPath = null;
  let processedPath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const { originalname, mimetype, path: filePath } = req.file;
    tempPath = filePath;
    const { compress = 'none', category = 'Others' } = req.body;
    
    console.log(`Upload request: ${originalname}, compress: ${compress}, category: ${category}, user: ${req.user.userId}`);
    
    const meta = await loadMeta();

    // File owner is the current user
    const ownerId = req.user.id;
    const ownerUserId = req.user.userId;

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

    console.log(`Processing file ID: ${id}, version: ${version}`);

    // Handle compression and upload to GCS
    if (compress === 'zip') {
      const zipPath = tempPath + '.zip';
      processedPath = zipPath;
      
      await new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip');
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);
        archive.file(tempPath, { name: originalname });
        archive.finalize();
      });
      
      gcsObjectKey += '.zip';
      const fileBuffer = fs.readFileSync(zipPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, 'application/zip');
      const metadata = await getFileMetadata(gcsObjectKey);
      size = metadata.size;
      compressionType = 'zip';
      finalMime = 'application/zip';
      
    } else if (compress === 'brotli') {
      const brotliPath = tempPath + '.br';
      processedPath = brotliPath;
      
      await new Promise((resolve, reject) => {
        const input = fs.createReadStream(tempPath);
        const output = fs.createWriteStream(brotliPath);
        input.pipe(zlib.createBrotliCompress()).pipe(output);
        output.on('finish', resolve);
        output.on('error', reject);
      });
      
      gcsObjectKey += '.br';
      const fileBuffer = fs.readFileSync(brotliPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, 'application/x-brotli');
      const metadata = await getFileMetadata(gcsObjectKey);
      size = metadata.size;
      compressionType = 'brotli';
      finalMime = 'application/x-brotli';
      
    } else {
      gcsObjectKey += path.extname(originalname);
      const fileBuffer = fs.readFileSync(tempPath);
      await uploadToGCS(gcsObjectKey, fileBuffer, mimetype);
      const metadata = await getFileMetadata(gcsObjectKey);
      size = metadata.size;
    }

    console.log(`File uploaded to GCS: ${gcsObjectKey}, size: ${size}`);

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
      ownerUserId
    };
    
    await saveMeta(meta);
    console.log(`Metadata saved for file: ${id}`);

    // Clean up temporary files
    try {
      if (tempPath && fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
        console.log(`Cleaned up temp file: ${tempPath}`);
      }
      if (processedPath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
        console.log(`Cleaned up processed file: ${processedPath}`);
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up temp files:', cleanupErr);
    }

    res.json({ 
      message: 'Upload complete', 
      fileId: id,
      version,
      category,
      size
    });
    
  } catch (err) {
    console.error('Upload error:', err);
    
    try {
      if (tempPath && fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      if (processedPath && fs.existsSync(processedPath)) {
        fs.unlinkSync(processedPath);
      }
    } catch (cleanupErr) {
      console.error('Error cleaning up after failure:', cleanupErr);
    }
    
    res.status(500).json({ 
      message: 'Upload failed', 
      error: err.message 
    });
  }
});

// Download endpoint
app.get('/api/files/download/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const meta = await loadMeta();
    const file = meta[fileId];
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && file.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    console.log(`Download request for: ${file.originalname} (${fileId}) by ${req.user.userId}`);

    res.setHeader('Content-Disposition', `attachment; filename="${file.originalname}"`);
    res.setHeader('Content-Type', file.mimetype);

    const readStream = getGCSDownloadStream(file.gcsObjectKey);

    readStream.on('error', err => {
      console.error('GCS read error:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'File read error', error: err.message });
      }
    });

    if (file.compressionType === 'zip') {
      const unzipper = require('unzipper');
      const unzipStream = readStream.pipe(unzipper.ParseOne());
      unzipStream.on('error', err => {
        console.error('Zip decompression error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Decompression error', error: err.message });
        }
      });
      unzipStream.pipe(res);
    } else if (file.compressionType === 'brotli') {
      const brotliStream = readStream.pipe(zlib.createBrotliDecompress());
      brotliStream.on('error', err => {
        console.error('Brotli decompression error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Decompression error', error: err.message });
        }
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
    const meta = await loadMeta();
    const isAdmin = req.user.role === 'admin';
    
    console.log(`List request from user: ${req.user.userId} (${req.user.role})`);
    
    // Filter files based on user role
    const userFiles = Object.values(meta).filter(f => 
      isAdmin || f.ownerId === req.user.id
    );

    console.log(`Found ${userFiles.length} files for user`);

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

        let size = latest.size || 0;
        
        if (!size && latest.storageProvider === 'gcs' && latest.gcsObjectKey) {
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
          storageProvider: latest.storageProvider || 'gcs',
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
  try {
    const { fileKey, version } = req.params;
    const meta = await loadMeta();
    const all = Object.values(meta);
    const current = all.find(f => f.id === fileKey);
    
    if (!current) {
      return res.status(404).json({ message: 'File not found' });
    }
    
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
    
    if (!target) {
      return res.status(404).json({ message: 'Requested version not found' });
    }
    
    res.redirect(`/api/files/download/${target.id}`);
  } catch (err) {
    console.error('Version download error:', err);
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Temp uploads directory: ${UPLOADS_DIR}`);
  console.log(`Metadata stored in GCS: ${META_GCS_KEY}`);
  console.log(`Users stored in GCS: ${USERS_GCS_KEY}`);
  console.log('System is fully cloud-based');
});