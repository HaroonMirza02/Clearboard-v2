require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const zlib = require('zlib');
const archiver = require('archiver');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const Busboy = require('busboy');
const { pipeline } = require('stream');
const { promisify } = require('util');
const pump = promisify(pipeline);
const {
  uploadToGCS,
  getGCSDownloadStream,
  getSignedUrl,
  getFileMetadata,
  deleteFromGCS,
  createGCSWriteStream
} = require('./services/gcs');

const app = express();
app.disable('x-powered-by');

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

// Always set CORS headers early so even failures include them
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  const reqHeaders = req.headers['access-control-request-headers'];
  res.setHeader('Access-Control-Allow-Headers', reqHeaders || 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Keep cors package too (no harm) in case of future dynamic needs
const corsOptions = {
  origin: function (origin, callback) {
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

app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Ensure uploads directory exists (for any residual temp needs)
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Note: We no longer use multer for uploads; we stream with Busboy.

// Hardcoded users (legacy)
const HARDCODED_USERS = [
  { userId: 'HaroonMirza', email: 'haroon.mirza040602@gmail.com', password: 'password123', id: 'user-1', role: 'user', department: 'Software Development' },
  { userId: 'IbrahimMalik', password: 'password123', id: 'user-2', role: 'user', department: 'Software Development' },
  { userId: 'ZaidBinAsim', password: 'password123', id: 'user-3', role: 'user', department: 'Data and Research Analyst' },
  { userId: 'MirzaUzairBaig', password: 'password123', id: 'user-4', role: 'user', department: 'Business Development' },
  { userId: 'CB_CEO_AliZakaria_01', password: 'admin123', id: 'admin-1', role: 'admin', department: 'Admin' }
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
  // Use a pooled transport to reuse SMTP connections and reduce handshake latency
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,   // per second window
    rateLimit: 10,     // max messages per second
    keepAlive: true,
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 15000,
  });
}

const mailer = createTransport();
// Warm up SMTP connection at startup to avoid first-email delay
if (mailer) {
  mailer.verify().then(() => {
    console.log('SMTP connection verified (pooled).');
  }).catch((e) => {
    console.warn('SMTP verify failed:', e?.message || e);
  });
}

// -------- Email Templates (HTML) --------
const EMAIL_BRAND = 'ClearBoard';
const emailBaseTemplate = (title, contentHtml) => `
<!DOCTYPE html>
<html lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;color:#111827;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f4f6f8;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;box-shadow:0 6px 24px rgba(16,24,40,0.08);overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;background:linear-gradient(180deg,#eef2ff,#ffffff);border-bottom:1px solid #eef2ff;">
              <div style="font-weight:800;font-size:20px;color:#1f2937;">${EMAIL_BRAND}</div>
              <div style="font-size:13px;color:#6b7280;margin-top:4px;">${title}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;">
              ${contentHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #f1f5f9;background:#fafafa;color:#6b7280;font-size:12px;">
              If you did not request this, you can safely ignore this email.
            </td>
          </tr>
        </table>
        <div style="margin-top:12px;color:#9ca3af;font-size:11px;">© ${new Date().getFullYear()} ${EMAIL_BRAND}. All rights reserved.</div>
      </td>
    </tr>
  </table>
</body>
</html>`;

const ctaButton = (href, label) => `
  <a href="${href}" target="_blank" rel="noopener" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;font-size:14px;">
    ${label}
  </a>
`;

const resetPasswordHtml = (userId, link) => emailBaseTemplate(
  'Reset your password',
  `
  <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">Hi <strong>${userId}</strong>,</p>
  <p style="margin:0 0 16px 0;font-size:14px;color:#374151;">Click the button below to reset your password. This link will expire in <strong>15 minutes</strong>.</p>
  <div style="margin:16px 0;">
    ${ctaButton(link, 'Reset Password')}
  </div>
  <p style="margin:16px 0 8px 0;font-size:12px;color:#6b7280;">Button not working? Copy and paste this URL into your browser:</p>
  <div style="word-break:break-all;font-size:12px;color:#2563eb;">${link}</div>
  `
);

const otpHtml = (userId, code) => emailBaseTemplate(
  'Your verification code',
  `
  <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">Hi <strong>${userId || 'there'}</strong>,</p>
  <p style="margin:0 0 12px 0;font-size:14px;color:#374151;">Use the following one-time code to verify your email. It expires in <strong>5 minutes</strong>.</p>
  <div style="margin:12px 0;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;font-size:22px;font-weight:800;letter-spacing:4px;text-align:center;color:#111827;">
    ${code}
  </div>
  <p style="margin:12px 0 0 0;font-size:12px;color:#6b7280;">If you didn’t request this, you can ignore this email.</p>
  `
);

// Cloud-based metadata storage keys
const META_GCS_KEY = 'metadata/filemeta.json';
const USERS_GCS_KEY = 'metadata/users.json';
const COUNTER_GCS_KEY = 'metadata/counter.json';

// Load counter from GCS
async function loadCounter() {
  try {
    const stream = getGCSDownloadStream(COUNTER_GCS_KEY);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const data = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(data);
  } catch (err) {
    if (err.code === 404 || err.message.includes('not found') || err.message.includes('No such object')) {
      console.log('Creating new counter.json in GCS');
      const initialCounter = { fileCounter: 0 };
      await saveCounter(initialCounter);
      return initialCounter;
    }
    console.error('Error loading counter:', err);
    return { fileCounter: 0 };
  }
}

// Save counter to GCS
async function saveCounter(counter) {
  try {
    const jsonString = JSON.stringify(counter, null, 2);
    const buffer = Buffer.from(jsonString, 'utf8');
    await uploadToGCS(COUNTER_GCS_KEY, buffer, 'application/json');
  } catch (err) {
    console.error('Error saving counter:', err);
    throw err;
  }
}

// Generate ClearBoard file name
// Format: Cb_012_CEO_AlNoor_whitelogo_01_010925
// Cb = ClearBoard prefix
// 012 = Unique incremental ID (3 digits, zero-padded)
// CEO = User who uploaded (from ownerUserId)
// AlNoor_whitelogo = Original filename (spaces replaced with -, underscores kept)
// 01 = Version number (2 digits, zero-padded)
// 010925 = File creation date (DDMMYY format)
function generateClearBoardFileName(counter, ownerUserId, originalFileName, version, fileCreatedAt) {
  // 1. Cb prefix
  const prefix = 'Cb';

  // 2. Unique ID (3 digits, zero-padded)
  const uniqueId = String(counter).padStart(3, '0');

  // 3. User who uploaded
  const user = ownerUserId || 'Unknown';

  // 4. Original filename (remove extension, replace spaces with -, keep underscores)
  const fileNameWithoutExt = path.parse(originalFileName).name;
  const sanitizedFileName = fileNameWithoutExt.replace(/\s+/g, '-');

  // 5. Version number (2 digits, zero-padded)
  const versionStr = String(version).padStart(2, '0');

  // 6. File creation date (DDMMYY format)
  const createdDate = new Date(fileCreatedAt);
  const day = String(createdDate.getDate()).padStart(2, '0');
  const month = String(createdDate.getMonth() + 1).padStart(2, '0');
  const year = String(createdDate.getFullYear()).slice(-2);
  const dateStr = `${day}${month}${year}`;

  // Combine all parts with underscores
  return `${prefix}_${uniqueId}_${user}_${sanitizedFileName}_${versionStr}_${dateStr}`;
}

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
    const html = resetPasswordHtml(currentUser.userId, resetLink);

    if (mailer) {
      await mailer.sendMail({
        from: EMAIL_FROM,
        to: userEmail,
        subject,
        text,
        html,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      });
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
    const html = resetPasswordHtml(user.userId, resetLink);

    if (mailer) {
      await mailer.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject,
        text,
        html,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      });
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
    const html = otpHtml('', code);

    if (mailer) {
      await mailer.sendMail({
        from: EMAIL_FROM,
        to: email,
        subject,
        text,
        html,
        priority: 'high',
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high'
        }
      });
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

    console.log(`[LOGIN] Request received - userId: ${userId}, department: ${department}`);

    if (!userId || !password) {
      return res.status(400).json({ message: 'User ID and password are required' });
    }

    const allUsers = await getAllUsers();
    const user = allUsers.find(u => u.userId === userId);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`[LOGIN] Password check - checking if user is in HARDCODED_USERS`);
    const isHardcodedUser = HARDCODED_USERS.some(u => u.userId === userId);
    console.log(`[LOGIN] isHardcodedUser: ${isHardcodedUser}`);

    // Check password
    let isValidPassword = false;

    if (isHardcodedUser) {
      console.log(`[LOGIN] User is hardcoded - comparing plain text passwords`);
      console.log(`[LOGIN] Provided password: "${password}"`);
      console.log(`[LOGIN] Stored password: "${user.password}"`);
      isValidPassword = user.password === password;
      console.log(`[LOGIN] Plain text comparison result: ${isValidPassword}`);
    } else {
      console.log(`[LOGIN] User is registered - comparing hashed passwords with bcrypt`);
      isValidPassword = await bcrypt.compare(password, user.password);
      console.log(`[LOGIN] Bcrypt comparison result: ${isValidPassword}`);
    }

    if (!isValidPassword) {
      console.log(`[LOGIN] Password validation failed for user: ${userId}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`[LOGIN] Password validation passed for user: ${userId}`);

    // Department-based RBAC
    const expectedDept = (user.department || '').toLowerCase();
    const requestDept = (department || '').toLowerCase();

    console.log(`[LOGIN RBAC] expectedDept: "${expectedDept}", requestDept: "${requestDept}"`);

    if (user.role === 'admin') {
      console.log(`[LOGIN] User is admin`);
      // Admin can login with or without specifying department
      // If they DO specify department, it must be 'admin'
      if (requestDept && requestDept !== 'admin') {
        console.log(`[LOGIN] REJECTED - Admin tried to login with department: ${requestDept}`);
        return res.status(403).json({ message: 'Admin users must login via Admin department or without department' });
      }
      // Admin login is allowed whether or not they specify department
      console.log(`[LOGIN] APPROVED - Admin user ${userId} allowed to login`);
    } else {
      console.log(`[LOGIN] User is not admin (role: ${user.role})`);
      // Non-admin cannot specify 'admin' department
      if (requestDept === 'admin') {
        console.log(`[LOGIN] REJECTED - Non-admin tried to login with admin department`);
        return res.status(403).json({ message: 'Access denied for Admin department' });
      }
      // For non-admins, if they specify a department, it must match their user's department
      if (requestDept && expectedDept && requestDept !== expectedDept) {
        console.log(`[LOGIN] REJECTED - Department mismatch: requested ${requestDept}, expected ${expectedDept}`);
        return res.status(403).json({ message: 'Department mismatch' });
      }
      console.log(`[LOGIN] APPROVED - Non-admin user ${userId} allowed to login`);
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

// Upload endpoint (streaming, with optional compression)
app.post('/api/files/upload', auth, async (req, res) => {
  const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024 * 1024); // 2GB default

  let uploadId = null;
  try {
    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_UPLOAD_BYTES } });

    let originalname = null;
    let mimetype = null;
    let category = 'Others';
    let compress = 'none';
    let fileCreatedAtField = null;

    // We will create these once file event fires
    let gcsObjectKey = null;
    let compressionType = 'none';
    let finalMime = null;
    let size = 0;
    let baseName = null;

    // Defer reading metadata until after the upload stream finishes to avoid blocking body read
    const ownerId = req.user.id;
    const ownerUserId = req.user.userId;

    const nowIso = new Date().toISOString();

    const finishUpload = async () => {
      if (!uploadId) return; // If file never arrived
      // Increased retries and delay for better reliability with multiple uploads
      // 5 retries × 2 seconds = up to 10 seconds wait time
      const metadata = await getFileMetadata(gcsObjectKey, 5, 2000);
      size = metadata.size;

      // Load meta now (post-upload) and determine firstUploadedAt and version
      const meta = await loadMeta();
      const sameGroup = Object.values(meta).filter(f =>
        f.baseName === baseName &&
        (f.category || 'Others') === category &&
        f.ownerId === ownerId
      );
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
      const fileCreatedAtDate = sameGroup.length > 0
        ? sameGroup[0].fileCreatedAt
        : (fileCreatedAtField ? new Date(fileCreatedAtField).toISOString() : nowIso);

      // Load and increment counter for new files only (version 1)
      let clearBoardFileName = baseName;
      let globalFileId = null;

      if (version === 1) {
        const counterData = await loadCounter();
        counterData.fileCounter = (counterData.fileCounter || 0) + 1;
        globalFileId = counterData.fileCounter;
        await saveCounter(counterData);

        // Generate the new ClearBoard file name
        clearBoardFileName = generateClearBoardFileName(
          globalFileId,
          ownerUserId,
          originalname,
          version,
          fileCreatedAtDate
        );
      } else {
        // For subsequent versions, use the same globalFileId and clearBoardFileName pattern
        globalFileId = sameGroup[0].globalFileId;
        clearBoardFileName = generateClearBoardFileName(
          globalFileId,
          ownerUserId,
          originalname,
          version,
          fileCreatedAtDate
        );
      }

      meta[uploadId] = {
        id: uploadId,
        originalname,
        baseName: clearBoardFileName, // Use the new naming convention
        displayName: clearBoardFileName, // For display purposes
        originalBaseName: baseName, // Keep original for reference
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
        ownerUserId,
        globalFileId // Store the global file ID for version tracking
      };

      await saveMeta(meta);
      res.json({ message: 'Upload complete', fileId: uploadId, version, category, size, fileName: clearBoardFileName });
    };

    busboy.on('field', (name, val) => {
      if (name === 'category') category = val || 'Others';
      if (name === 'compress') compress = val || 'none';
      if (name === 'fileCreatedAt') fileCreatedAtField = val;
    });

    busboy.on('file', async (name, file, info) => {
      try {
        originalname = info.filename;
        mimetype = info.mimeType;
        finalMime = mimetype;
        baseName = path.parse(originalname).name;
        uploadId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        gcsObjectKey = `files/${uploadId}`;

        if (compress === 'zip') {
          gcsObjectKey += '.zip';
          compressionType = 'zip';
          finalMime = 'application/zip';

          const zip = archiver('zip');
          zip.on('error', err => { file.destroy(err); });

          // Wire pipeline before finalizing so no zip data is lost
          const write = createGCSWriteStream(gcsObjectKey, finalMime, { resumable: true });
          const pumping = pump(zip, write);

          // Append the uploaded stream into the archive under its original name
          zip.append(file, { name: originalname });
          // Finalize the archive; pipeline will resolve when write finishes
          zip.finalize();

          await pumping;

        } else if (compress === 'brotli') {
          gcsObjectKey += '.br';
          compressionType = 'brotli';
          finalMime = 'application/x-brotli';

          const br = zlib.createBrotliCompress();
          const write = createGCSWriteStream(gcsObjectKey, finalMime, { resumable: true });
          write.on('error', err => file.destroy(err));
          await pump(file, br, write);

        } else {
          gcsObjectKey += path.extname(originalname);
          const write = createGCSWriteStream(gcsObjectKey, mimetype, { resumable: true });
          write.on('error', err => file.destroy(err));
          await pump(file, write);
        }
      } catch (e) {
        busboy.emit('error', e);
      }
    });

    busboy.on('error', (err) => {
      console.error('Busboy error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'Upload failed', error: err.message });
    });

    busboy.on('finish', async () => {
      try {
        if (!uploadId) {
          return res.status(400).json({ message: 'No file uploaded' });
        }
        await finishUpload();
      } catch (err) {
        console.error('Upload finalize error:', err);
        if (!res.headersSent) res.status(500).json({ message: 'Upload failed', error: err.message });
      }
    });

    req.pipe(busboy);
  } catch (err) {
    console.error('Upload error (outer):', err);
    if (!res.headersSent) res.status(500).json({ message: 'Upload failed', error: err.message });
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

// ✅ REPLACE your old edit endpoint with this streaming version
app.post('/api/files/edit/:fileId', auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const meta = await loadMeta();
    const originalFile = meta[fileId];

    if (!originalFile) {
      return res.status(404).json({ message: 'File version not found' });
    }

    if (req.user.role !== 'admin' && originalFile.ownerId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let newName = null;
    let newCategory = null;
    let newFileCreatedAt = null;
    let uploadedNewVersion = false;
    let newFileId = null;

    const busboy = Busboy({ headers: req.headers, limits: { files: 1, fileSize: Number(process.env.MAX_UPLOAD_BYTES || 2 * 1024 * 1024 * 1024) } });

    busboy.on('field', (name, val) => {
      if (name === 'name') newName = val;
      if (name === 'category') newCategory = val;
      if (name === 'fileCreatedAt') newFileCreatedAt = val;
    });

    busboy.on('file', async (name, file, info) => {
      try {
        // Create a new version if a new file was uploaded
        uploadedNewVersion = true;
        const sameGroup = Object.values(meta).filter(f =>
          f.baseName === originalFile.baseName &&
          f.ownerId === originalFile.ownerId
        );
        const maxVersion = sameGroup.length ? Math.max(...sameGroup.map(f => f.version || 1)) : 0;
        const newVersionNumber = maxVersion + 1;

        newFileId = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        const ext = path.extname(info.filename);
        const gcsObjectKey = `files/${newFileId}${ext}`;

        const write = createGCSWriteStream(gcsObjectKey, info.mimeType, { resumable: true });
        await pump(file, write);

        const metadata = await getFileMetadata(gcsObjectKey);
        meta[newFileId] = {
          ...originalFile,
          id: newFileId,
          gcsObjectKey,
          version: newVersionNumber,
          modifiedAt: new Date().toISOString(),
          size: metadata.size,
          originalname: info.filename,
          baseName: path.parse(info.filename).name,
          category: newCategory ?? originalFile.category,
        };
      } catch (e) {
        busboy.emit('error', e);
      }
    });

    busboy.on('error', (err) => {
      console.error('Edit busboy error:', err);
      if (!res.headersSent) res.status(500).json({ message: 'Failed to edit file', error: err.message });
    });

    busboy.on('finish', async () => {
      try {
        if (!uploadedNewVersion) {
          // Only metadata change
          const originalExt = path.extname(originalFile.originalname);
          if (newName) {
            originalFile.originalname = `${newName}${originalExt}`;
            originalFile.baseName = newName;
          }
          if (newCategory) originalFile.category = newCategory;
          originalFile.modifiedAt = new Date().toISOString();
          if (newFileCreatedAt) {
            originalFile.fileCreatedAt = new Date(newFileCreatedAt).toISOString();
          }
        }
        await saveMeta(meta);
        res.status(200).json({ message: 'File updated successfully', fileId: uploadedNewVersion ? newFileId : fileId });
      } catch (err) {
        console.error('Edit finalize error:', err);
        if (!res.headersSent) res.status(500).json({ message: 'Failed to edit file', error: err.message });
      }
    });

    req.pipe(busboy);
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

// Global error handler — ensure CORS headers are present on errors for allowed origins
app.use((err, req, res, next) => {
  try {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
  } catch { }
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  if (!res.headersSent) res.status(status).json({ message, error: message });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Temp uploads directory: ${UPLOADS_DIR}`);
  console.log(`Metadata stored in GCS: ${META_GCS_KEY}`);
  console.log(`Users stored in GCS: ${USERS_GCS_KEY}`);
  console.log('System is fully cloud-based');
});
