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
const nodemailer = require('nodemailer');
const { uploadToGCS, getGCSDownloadStream, getSignedUrl, getFileMetadata, deleteFromGCS } = require('./services/gcs');

const app = express();

// Enable CORS for frontend origins
const ALLOWED_ORIGINS = [
  "https://fifth-flame-472409-q0.web.app",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:4173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://127.0.0.1:4173"
];

const corsOptions = {
  origin: function(origin, callback) {
    // Allow non-browser requests or same-origin with no Origin header
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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
  { userId: 'HaroonMirza', email:'haroon.mirza040602@gmail.com', password: 'password123', id: 'user-1', role: 'user', department: 'Software Development' },
  { userId: 'IbrahimMalik', password: 'password123', id: 'user-2', role: 'user', department: 'Software Development' },
  { userId: 'ZaidBinAsim', password: 'password123', id: 'user-3', role: 'user', department: 'Data and Research Analyst' },
  { userId: 'MirzaUzairBaig', password: 'password123', id: 'user-4', role: 'user', department: 'Business Development' },
  { userId: 'AliZakaria', password: 'admin123', id: 'admin-1', role: 'admin', department: 'Admin' }
];

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.EMAIL_USER || 'no-reply@example.com';
const SMTP_HOST = process.env.SMTP_HOST || process.env.EMAIL_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || process.env.EMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.EMAIL_PASS || '';

// Simple in-memory OTP store: { email: { code, expiresAt } }
const OTP_STORE = new Map();

function createTransport() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn('SMTP not configured. OTP emails will be logged to console.');
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

const mailer = createTransport();

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
    const { userId, password, email, department, verificationToken } = req.body;

    // Validation
    if (!userId || !password) {
      return res.status(400).json({ message: 'User ID and password are required' });
    }

    if (userId.length < 3) {
      return res.status(400).json({ message: 'User ID must be at least 3 characters' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    // Require verified email via OTP
    if (!verificationToken) {
      return res.status(403).json({ message: 'Email verification required' });
    }
    try {
      const decoded = jwt.verify(verificationToken, JWT_SECRET);
      if (!decoded?.emailVerified || decoded.emailVerified !== String(email).toLowerCase()) {
        return res.status(403).json({ message: 'Email not verified' });
      }
    } catch (e) {
      return res.status(403).json({ message: 'Invalid or expired verification token' });
    }

    // Admin signups are forbidden
    if (String(department).toLowerCase() === 'admin') {
      return res.status(403).json({ message: 'Admin signup is disabled' });
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
      department: department || 'Software Development',
      createdAt: new Date().toISOString()
    };

    // Save to registered users
    const registeredUsers = await loadUsers();
    registeredUsers.push(newUser);
    await saveUsers(registeredUsers);

    console.log(`New user registered: ${userId} (${id})`);

    // Generate token
    const token = jwt.sign({ id: newUser.id, userId: newUser.userId, role: newUser.role, department: newUser.department }, JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json({ 
      message: 'User registered successfully',
      token, 
      role: newUser.role,
      userId: newUser.userId,
      department: newUser.department
    });

  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ message: 'Signup failed', error: err.message });
  }
});

// Add this near your other auth routes in server.js

// In server.js

// ✅ NEW: Endpoint for LOGGED-IN users to change their password
app.post('/api/auth/change-password', auth, async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ message: 'Authentication required.' });
        }

        const allUsers = await getAllUsers();
        const currentUser = allUsers.find(u => u.id === req.user.id);

        if (!currentUser || !currentUser.email) {
            return res.status(404).json({ message: 'User or user email not found.' });
        }
        
        const userEmail = currentUser.email;
        const resetToken = jwt.sign({ userId: currentUser.id, email: userEmail }, JWT_SECRET, { expiresIn: '15m' });
        const resetLink = `https://fifth-flame-472409-q0.web.app/reset-password/${resetToken}`;
        
        // ... (email sending logic remains the same)
        const subject = 'Your Password Reset Link';
        const text = `Hi ${currentUser.userId},\n\nPlease click the link to reset your password. It's valid for 15 minutes.\n\n${resetLink}`;
        
        if (mailer) {
            await mailer.sendMail({ from: EMAIL_FROM, to: userEmail, subject, text });
        } else {
            console.log(`[DEV PASSWORD RESET LINK] For ${userEmail}: ${resetLink}`);
        }

        res.json({ message: 'A password reset link has been sent to your registered email.' });

    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ message: 'An error occurred.' });
    }
});


// ✅ MODIFIED: Endpoint for LOGGED-OUT users to recover their password
// Note: We've removed the 'auth' middleware and the logic for logged-in users
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email address is required.' });
        }

        const allUsers = await getAllUsers();
        const user = allUsers.find(u => u.email && u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
            console.log(`Password reset requested for non-existent email: ${email}`);
            return res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
        }
        
        const resetToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
        const resetLink = `https://fifth-flame-472409-q0.web.app/reset-password/${resetToken}`;

        // ... (email sending logic remains the same)
        const subject = 'Your Password Reset Link';
        const text = `Hi ${user.userId},\n\nPlease click the link to reset your password. It's valid for 15 minutes.\n\n${resetLink}`;
        
        if (mailer) {
            await mailer.sendMail({ from: EMAIL_FROM, to: email, subject, text });
        } else {
            console.log(`[DEV PASSWORD RESET LINK] For ${email}: ${resetLink}`);
        }

        res.json({ message: 'If an account with that email exists, a reset link has been sent.' });

    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ message: 'An error occurred.' });
    }
});


// RESET THE PASSWORD USING THE TOKEN FROM THE LINK
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required.' });
        }
        
        if (newPassword.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return res.status(400).json({ message: 'Invalid or expired reset token.' });
        }

        const { userId } = decoded;
        
        const registeredUsers = await loadUsers();
        const userIndex = registeredUsers.findIndex(u => u.id === userId);

        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        registeredUsers[userIndex].password = hashedPassword;

        await saveUsers(registeredUsers);
        
        console.log(`Password reset successfully for user ID: ${userId}`);
        res.json({ message: 'Password has been reset successfully.' });

    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
});

// Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    OTP_STORE.set(email.toLowerCase(), { code, expiresAt });

    const subject = 'Your ClearBoard verification code';
    const text = `Your verification code is: ${code}. It expires in 5 minutes.`;

    if (mailer) {
      await mailer.sendMail({ from: EMAIL_FROM, to: email, subject, text });
    } else {
      console.log(`[DEV OTP] ${email} -> ${code}`);
    }

    const payload = { message: 'OTP sent' };
    // Only surface devOtp when no mailer is configured
    if (!mailer) {
      payload.devOtp = code;
    }
    res.json(payload);
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'Email and code are required' });
    const entry = OTP_STORE.get(email.toLowerCase());
    if (!entry) return res.status(400).json({ message: 'No OTP requested for this email' });
    if (Date.now() > entry.expiresAt) {
      OTP_STORE.delete(email.toLowerCase());
      return res.status(400).json({ message: 'OTP expired' });
    }
    if (entry.code !== String(code)) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }
    // Mark verified and issue a short-lived token authorizing signup
    OTP_STORE.delete(email.toLowerCase());
    const verificationToken = jwt.sign({ emailVerified: email.toLowerCase() }, JWT_SECRET, { expiresIn: '10m' });
    res.json({ message: 'OTP verified', verificationToken });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ message: 'OTP verification failed' });
  }
});

// Login endpoint (returns JWT)
app.post('/api/login', async (req, res) => {
  try {
    const { userId, password, department } = req.body;

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

    // Department-based RBAC
    const expectedDept = (user.department || '').toLowerCase();
    const requestDept = (department || '').toLowerCase();

    if (user.role === 'admin') {
      // Admin must login only via Admin department
      if (requestDept !== 'admin') {
        return res.status(403).json({ message: 'Admin must login via Admin department' });
      }
    } else {
      // Non-admin cannot login via Admin and must match their own department
      if (requestDept === 'admin') {
        return res.status(403).json({ message: 'Access denied for Admin department' });
      }
      if (expectedDept && requestDept && expectedDept !== requestDept) {
        return res.status(403).json({ message: 'Department mismatch' });
      }
    }

    const token = jwt.sign({ id: user.id, userId: user.userId, role: user.role, department: user.department }, JWT_SECRET, { expiresIn: '15m' });
    
    console.log(`User logged in: ${userId} (${user.role})`);
    
    res.json({ token, role: user.role, userId: user.userId, department: user.department });

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
    const { compress = 'none', category = 'Others', fileCreatedAt } = req.body;
    
    console.log(`Upload request: ${originalname}, compress: ${compress}, category: ${category}, user: ${req.user.userId}`);
    // ✅ NEW: Get the base name without the extension
    const baseName = path.parse(originalname).name;
    const meta = await loadMeta();

    // File owner is the current user
    const ownerId = req.user.id;
    const ownerUserId = req.user.userId;

    // ✅ CHANGED: Find versions using baseName instead of originalname
    const sameGroup = Object.values(meta).filter(f => 
      f.baseName === baseName && 
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
    
    // Handle fileCreatedAt - use provided date or current date for first version
    const fileCreatedAtDate = sameGroup.length > 0 
      ? sameGroup[0].fileCreatedAt // Keep existing fileCreatedAt for subsequent versions
      : (fileCreatedAt ? new Date(fileCreatedAt).toISOString() : nowIso);

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
      baseName,
      mimetype,
      gcsObjectKey,
      storageProvider: 'gcs',
      compressionType,
      finalMime,
      category,
      version,
      uploadedAt,
      modifiedAt,
      fileCreatedAt: fileCreatedAtDate,
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

    // Authorization check - allow access to own files and shared files
    const hasAccess = req.user.role === 'admin' || 
                     file.ownerId === req.user.id || 
                     (file.isShared && file.sharedWithTeams && file.sharedWithTeams.includes(req.user.department));
    
    if (!hasAccess) {
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


// ✅ NEW: DELETE A FILE VERSION
app.delete('/api/files/delete/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const meta = await loadMeta();
    const fileToDelete = meta[fileId];

    if (!fileToDelete) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Authorization: only owner or admin can delete
    if (req.user.role !== 'admin' && fileToDelete.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // 1. Delete the file from Google Cloud Storage
    await deleteFromGCS(fileToDelete.gcsObjectKey);

    // 2. Remove the file's metadata
    delete meta[fileId];

    // 3. Save the updated metadata
    await saveMeta(meta);

    console.log(`File deleted successfully: ${fileId} by user ${req.user.userId}`);
    res.status(200).json({ message: 'File deleted successfully' });

  } catch (err) {
    console.error('Delete file error:', err);
    res.status(500).json({ message: 'Failed to delete file', error: err.message });
  }
});

// ✅ REPLACE your old edit endpoint with this new one
app.post('/api/files/edit/:fileId', auth, upload.single('newFile'), async (req, res) => {
  try {
        console.log('Backend received req.body:', req.body);

    const { fileId } = req.params;
    const { name, category, fileCreatedAt } = req.body;
    const meta = await loadMeta();
    const originalFile = meta[fileId];

    if (!originalFile) {
      return res.status(404).json({ message: 'File version not found' });
    }

    // Authorization check
    if (req.user.role !== 'admin' && originalFile.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    // --- SCENARIO 1: A new file was uploaded (creating a new version) ---
    if (req.file) {
      console.log(`New version upload for: ${originalFile.originalname}`);
      // This logic is adapted from your original /upload endpoint
      const { originalname: newName, mimetype, path: filePath } = req.file;
      
      // ✅ CHANGED: Find versions using baseName
      const sameGroup = Object.values(meta).filter(f => 
        f.baseName === originalFile.baseName && 
        f.ownerId === originalFile.ownerId
      );
      const maxVersion = Math.max(...sameGroup.map(f => f.version || 1));
      
      const newVersionNumber = maxVersion + 1;
      const newFileId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      const gcsObjectKey = `files/${newFileId}${path.extname(newName)}`;

      // Upload the new file to GCS
      const fileBuffer = fs.readFileSync(filePath);
      await uploadToGCS(gcsObjectKey, fileBuffer, mimetype);
      fs.unlinkSync(filePath); // Clean up temp file

      const metadata = await getFileMetadata(gcsObjectKey);
      // ✅ CHANGED: When creating the new metadata entry
      meta[newFileId] = {
        ...originalFile,
        id: newFileId,
        gcsObjectKey,
        version: newVersionNumber,
        modifiedAt: new Date().toISOString(),
        size: metadata.size,
        // Update name and category, and ensure new originalname/baseName are set
        originalname: newName,
        baseName: path.parse(newName).name, // Use the new file's base name
        category: category,
      };
      
    // --- SCENARIO 2: Only metadata (name/category) was changed ---
    } else {
    // ✅ CHANGED: Also update baseName when only metadata changes
      const originalExt = path.extname(originalFile.originalname);
      originalFile.originalname = `${name}${originalExt}`;
      originalFile.baseName = name; // Update the base name
      originalFile.category = category;
      originalFile.modifiedAt = new Date().toISOString();
      
      // Update fileCreatedAt if provided
      if (fileCreatedAt) {
        originalFile.fileCreatedAt = new Date(fileCreatedAt).toISOString();
      }
    }

    await saveMeta(meta);
    res.status(200).json({ message: 'File updated successfully' });

  } catch (err) {
    console.error('Edit file error:', err);
    res.status(500).json({ message: 'Failed to edit file', error: err.message });
  }
});

// THIS IS THE CORRECT CODE. USE THIS INSTEAD.
app.get('/api/files', auth, async (req, res) => {
  try {
    const meta = await loadMeta();
    const isAdmin = req.user.role === 'admin';
    
    console.log(`List request from user: ${req.user.userId} (${req.user.role})`);
    
    // Get user's own files and files shared with their department
    const userFiles = Object.values(meta).filter(f => {
      if (isAdmin) return true;
      if (f.ownerId === req.user.id) return true;
      if (f.isShared && f.sharedWithTeams && f.sharedWithTeams.includes(req.user.department)) return true;
      return false;
    });
// ✅ ADD THIS LOGGING BLOCK TO INSPECT THE DATA
console.log("--- INSPECTING ALL USER FILES BEFORE GROUPING ---");
userFiles.forEach(f => {
  console.log(`ID: ${f.id}, OriginalName: ${f.originalname}, BaseName: ${f.baseName}`);
});
console.log("-------------------------------------------");

    console.log(`Found ${userFiles.length} files for user`);

    const groups = {};
    userFiles.forEach(f => {
      // Use baseName OR calculate it for backwards compatibility
      const groupName = f.baseName || path.parse(f.originalname).name;
      const key = `${groupName}||${f.category || 'Others'}||${f.ownerId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });

    const files = Object.values(groups).map(arr => {
      arr.sort((a, b) => (b.version || 1) - (a.version || 1));
      const latest = arr[0];
    const totalGroupSize = arr.reduce((sum, v) => sum + (v.size || 0), 0);

      // Return the new, correct data structure
      return {
        id: latest.id,
        name: latest.baseName || path.parse(latest.originalname).name,
        category: latest.category || 'Others',
        ownerUserId: latest.ownerUserId || 'unknown',
        totalSizeKB: (arr.reduce((sum, v) => sum + (v.size || 0), 0) / 1024).toFixed(1),
        isShared: latest.isShared || false,
        sharedWithTeams: latest.sharedWithTeams || [],
        sharedAt: latest.sharedAt,
        isOwner: latest.ownerId === req.user.id,
        // This creates the detailed array the frontend needs
        versions: arr.map(v => {
          const ext = path.parse(v.originalname).ext.replace('.', '');
          return {
            id: v.id,
            version: v.version || 1,
            fileType: ext,
            size: (v.size / 1024).toFixed(1),
            compressionType: v.compressionType,
            uploadedAt: v.uploadedAt,
            modifiedAt: v.modifiedAt,
            fileCreatedAt: v.fileCreatedAt
          };
        })
      };
    });

    res.json(files);
  } catch (err) {
    console.error('List error:', err);
    res.status(500).json({ message: 'List failed', error: err.message });
  }
});

// In server.js

// Replace your existing /api/files/download/:fileKey/version/:version endpoint with this one
app.get('/api/files/download/:fileKey/version/:version', auth, async (req, res) => {
  try {
    const { fileKey, version } = req.params;
    const meta = await loadMeta();
    const allFiles = Object.values(meta);
    const currentFile = allFiles.find(f => f.id === fileKey);
    
    if (!currentFile) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Authorization check - allow access to own files and shared files
    const hasAccess = req.user.role === 'admin' || 
                     currentFile.ownerId === req.user.id || 
                     (currentFile.isShared && currentFile.sharedWithTeams && currentFile.sharedWithTeams.includes(req.user.department));
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // ✅ THIS IS THE FIX: We now group files by 'baseName'
    const versionGroup = allFiles.filter(f => 
      f.baseName === currentFile.baseName && 
      (f.category || 'Others') === (currentFile.category || 'Others') &&
      f.ownerId === currentFile.ownerId
    );
    
    const targetVersion = versionGroup.find(f => (f.version || 1) === Number(version));
    
    if (!targetVersion) {
      return res.status(404).json({ message: 'Requested version not found' });
    }
    
    // Redirect to the simple download endpoint with the correct ID for the target version
    res.redirect(307, `/api/files/download/${targetVersion.id}`);

  } catch (err) {
    console.error('Version download error:', err);
    res.status(500).json({ message: 'Download failed', error: err.message });
  }
});

// Share file with team
app.post('/api/files/share/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userDepartment = req.user.department;
    
    if (!userDepartment) {
      return res.status(400).json({ message: 'User department information not found' });
    }
    
    const meta = await loadMeta();
    const file = meta[fileId];
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user owns the file or has admin role
    if (file.ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only share files you own' });
    }
    
    // Update file sharing status
    file.isShared = true;
    file.sharedWithTeams = [userDepartment];
    file.sharedAt = new Date().toISOString();
    file.sharedBy = userId;
    
    await saveMeta(meta);
    
    console.log(`File ${fileId} shared with ${userDepartment} team by ${req.user.userId}`);
    
    res.json({ 
      message: `File shared successfully with ${userDepartment} team members`,
      fileId: file.id,
      sharedWithTeams: file.sharedWithTeams
    });
  } catch (err) {
    console.error('Share file error:', err);
    res.status(500).json({ message: 'Failed to share file', error: err.message });
  }
});

// Unshare file (remove sharing)
app.post('/api/files/unshare/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    
    const meta = await loadMeta();
    const file = meta[fileId];
    
    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }
    
    // Check if user owns the file or has admin role
    if (file.ownerId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only unshare files you own' });
    }
    
    // Update file sharing status
    file.isShared = false;
    file.sharedWithTeams = [];
    file.sharedAt = null;
    file.sharedBy = null;
    
    await saveMeta(meta);
    
    console.log(`File ${fileId} unshared by ${req.user.userId}`);
    
    res.json({ 
      message: 'File sharing removed successfully',
      fileId: file.id
    });
  } catch (err) {
    console.error('Unshare file error:', err);
    res.status(500).json({ message: 'Failed to unshare file', error: err.message });
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