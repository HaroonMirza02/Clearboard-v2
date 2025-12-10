import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ UPDATED: include useLocation
import { useIdleTimer } from '../hooks/useIdleTimer'; // Import the new hook
import Fuse from 'fuse.js';
import '../styles/Dashboard.css'; // Import the new CSS file
import '../styles/Modal.css'; // The new modal styles
import '../styles/Calendar.css'; // Professional calendar picker styling
import AdminUserFilter from './AdminUserFilter';
import SemanticSearchBar from './SemanticSearchBar'; // ✅ NEW: Semantic search component

const TEAM_CATEGORIES = {
  'Software Development': ['WebDev Assets', 'General Research', 'Project Demo', 'Source Code'],
  'Business Development': ['Websites', 'Software', 'Dashboards', 'Financial Research', 'Company Research', 'Graphic Design', 'Storage'],
  'Data and Research Analyst': ['WebDev Assets', 'General Research', 'Project Demo', 'Source Code'],
  'Admin': [] // will be computed as union below
};

TEAM_CATEGORIES['Admin'] = Array.from(new Set([
  ...TEAM_CATEGORIES['Software Development'],
  ...TEAM_CATEGORIES['Business Development'],
  ...TEAM_CATEGORIES['Data and Research Analyst'],
]));

const getTeamCategories = (dept) => {
  return TEAM_CATEGORIES[dept] || [];
};

// Fixed list of admin project filters used in CEO Portal > Projects card
const ADMIN_PROJECTS = [
  'Websites',
  'Software',
  'Dashboards',
  'Financial Research',
  'Company Research',
  'Graphic Design',
  'Storage',
];

// Styles
const pageStyle = { background: '#f4f7fb', minHeight: '100vh', padding: '48px 16px' };
const cardStyle = {
  maxWidth: 420,
  margin: '8vh auto',
  padding: '28px 24px',
  borderRadius: 14,
  boxShadow: '0 6px 28px rgba(16,24,40,0.08)',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};
const brandTitle = { fontWeight: 800, fontSize: 30, margin: 0, color: '#1f2a37', letterSpacing: 0.3 };
const brandSub = { fontSize: 15, color: '#64748b', marginBottom: 8 };
const label = { fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' };
const input = { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 15, outline: 'none' };
const primaryBtn = { width: '100%', padding: 12, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer' };
const toggleBtn = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', textDecoration: 'underline', fontSize: 14, marginTop: 10 };

const container = { maxWidth: 1180, margin: '0 auto' };
const sectionCard = { background: '#fff', borderRadius: 14, boxShadow: '0 6px 28px rgba(16,24,40,0.06)', padding: 20 };
const uploadGrid = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 260px) minmax(160px, 220px) minmax(160px, 220px) auto', gap: 12, alignItems: 'end' };
const select = { ...input };
const smallBtn = { padding: '12px 18px', borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' };

const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 30 };
const statCard = { ...sectionCard, padding: 24 };
const statTitle = { fontSize: 14, color: '#64748b', fontWeight: 600, marginBottom: 8 };
const statValue = { fontSize: 32, fontWeight: 500, color: '#1f2a37', marginBottom: 4 };
const statSub = { fontSize: 13, color: '#10b981' };

const tableWrap = { ...sectionCard, padding: 0 };
const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: 0 };
const thStyle = { background: '#fff', color: '#222', fontWeight: 600, padding: '8px 10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: 12, letterSpacing: 0.1, verticalAlign: 'middle', height: 32, boxSizing: 'border-box' };
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', verticalAlign: 'middle', fontSize: 12, color: '#222', background: '#fff', height: 32, boxSizing: 'border-box' };
const zebra = idx => ({ background: idx % 2 === 0 ? '#fff' : '#fafbff' });
const pill = { padding: '4px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: 12, display: 'inline-block' };
const adminBadge = { padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-block', marginLeft: 12 };
const userBadge = {
  padding: '6px 12px',
  borderRadius: 6,
  background: '#e5e7eb',
  color: '#111827',
  fontWeight: 600,
  fontSize: 12,
  display: 'inline-block'
};

// --- NEW STYLES START ---
const userMenuContainer = { position: 'relative' };
const userAvatar = {
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#4f46e5',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 18,
  fontWeight: 'bold',
  cursor: 'pointer',
  textTransform: 'uppercase',
  border: '2px solid #fff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
};
const dropdownMenu = {
  position: 'absolute',
  top: 'calc(100% + 8px)',
  right: 0,
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 8px 32px rgba(16,24,40,0.12)',
  width: 200,
  zIndex: 100,
  border: '1px solid #e2e8f0',
  overflow: 'hidden',
  animation: 'fadeIn 0.2s ease-out'
};
const menuItem = {
  display: 'block',
  width: '100%',
  padding: '12px 16px',
  background: 'none',
  border: 'none',
  textAlign: 'left',
  fontSize: 14,
  color: '#334155',
  cursor: 'pointer',
};
const menuDivider = {
  height: 1,
  background: '#f1f5f9',
  margin: '4px 0',
};

// Progress and notification styles
const progressContainer = {
  width: '100%',
  height: 6,
  backgroundColor: '#e5e7eb',
  borderRadius: 3,
  overflow: 'hidden',
  marginTop: 8
};
const progressBar = {
  height: '100%',
  backgroundColor: '#10b981',
  borderRadius: 3,
  transition: 'width 0.3s ease',
  width: '0%'
};
const errorText = {
  color: '#dc2626',
  fontSize: 12,
  marginTop: 4,
  fontWeight: 500
};
const successNotification = {
  position: 'fixed',
  bottom: 20,
  left: 20,
  background: '#10b981',
  color: 'white',
  padding: '12px 20px',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  fontSize: 14,
  fontWeight: 600,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  transform: 'translateX(-100%)',
  transition: 'transform 0.3s ease'
};
const successNotificationVisible = {
  ...successNotification,
  transform: 'translateX(0)'
};

function FileList(props) {
  const [adminOwnerFilter, setAdminOwnerFilter] = React.useState('');
  const [adminFilterMode, setAdminFilterMode] = useState('owner'); // 'owner' or 'project'
  const [adminProjectFilter, setAdminProjectFilter] = useState('');
  const [isContextView, setIsContextView] = useState(false); // true when coming from Teams/Projects context
  const [contextUserParam, setContextUserParam] = useState(''); // raw ?user=... from URL for Teams view
  const uploadAbortControllerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('');
  // readOnlyMode removed — keep a default false to avoid runtime errors from leftover checks
  const readOnlyMode = false;
  // Dynamic storage quota: 20GB for admin, 5GB for others (in MB)
  const STORAGE_QUOTA_MB = React.useMemo(() => (userRole === 'admin' ? 20 * 1024 : 5 * 1024), [userRole]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [login, setLogin] = useState({ userId: '', password: '' });
  const [signup, setSignup] = useState({ userId: '', password: '', confirmPassword: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [compress, setCompress] = useState('none');
  const [category, setCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [fileCreatedAt, setFileCreatedAt] = useState('');
  const [selectedVersions, setSelectedVersions] = useState({});
  const [is2faEnabled, setIs2faEnabled] = useState(false); // State for 2FA toggle
  // Real-time Stats
  const [stats, setStats] = useState({ totalFiles: 0, storageUsedKB: 0, storageUsedMB: 0 });
  const [currentUserId, setCurrentUserId] = useState('');
  const [success, setSuccess] = useState('');
  const [department, setDepartment] = useState('');
  // In FileList.jsx
  // ✅ --- NEW STATES FOR MODALS & ACTIONS ---
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null); // File to be edited/deleted
  // Preview modal states
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewFileData, setPreviewFileData] = useState(null); // { fileId, name, fileType, version, url }
  const [previewLoading, setPreviewLoading] = useState(false);
  // ✅ UPDATED state for the edit form
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    customCategory: '',
    newFile: null,
    fileCreatedAt: '',
  });
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [downloadLinkSending, setDownloadLinkSending] = useState(false);
  const { percentageUsed, spaceLeftGB } = React.useMemo(() => {

    if (!stats.storageUsedMB) {

      return { percentageUsed: 0, spaceLeftGB: STORAGE_QUOTA_MB / 1024 };

    }

    const used = stats.storageUsedMB;

    const percentage = Math.min((used / STORAGE_QUOTA_MB) * 100, 100);

    const left = (STORAGE_QUOTA_MB - used) / 1024;


    return {

      percentageUsed: percentage.toFixed(2),

      spaceLeftGB: left.toFixed(2)

    };

  }, [stats.storageUsedMB, STORAGE_QUOTA_MB]);

  // ✅ UPDATED handler to open the edit modal and populate state
  const handleOpenEditModal = (file) => {
    if (readOnlyMode) return; // Block in read-only
    setSelectedFile(file);
    // Get all available categories (predefined + dynamic from existing files)
    const uniqueCats = [...new Set(files.map(f => f.category))].sort();
    const availableCategories = [...new Set([...(getTeamCategories(department)), ...uniqueCats])].sort();
    // Check if the file's category is one of the available options
    const isCategoryInList = availableCategories.includes(file.category);
    // Get the currently displayed version for fileCreatedAt
    const selectedVersionNumber = selectedVersions[file.id] ?? file.versions[0].version;
    const displayedVersion = file.versions.find(v => v.version === selectedVersionNumber) || file.versions[0];
    setEditFormData({
      name: file.name,
      category: isCategoryInList ? file.category : 'Others',
      customCategory: isCategoryInList ? '' : file.category,
      newFile: null,
      fileCreatedAt: displayedVersion.fileCreatedAt ? new Date(displayedVersion.fileCreatedAt).toISOString().split('T')[0] : '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDeleteModal = (file) => {
    if (readOnlyMode) return; // Block in read-only
    setSelectedFile(file);
    setIsDeleteModalOpen(true);
  };

  const handleCancelUpload = () => {
    if (uploadAbortControllerRef.current) {
      uploadAbortControllerRef.current.abort();
      console.log("Upload cancelled by user.");
    }
  };

  const removeFile = (index) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
    // Clear file validation error if present
    if (validationErrors.file) {
      setValidationErrors({ ...validationErrors, file: '' });
    }
  };

  const handleCloseModals = () => {
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    setSelectedFile(null);
  };

  // ✅ UPDATED handler to manage form changes (including the file input)
  const handleEditFormChange = (e) => {
    if (readOnlyMode) return; // Block in read-only
    const { name, value, files } = e.target;
    if (name === 'newFile') {
      setEditFormData({ ...editFormData, newFile: files[0] });
    } else {
      setEditFormData({ ...editFormData, [name]: value });
    }
  };

  // ✅ REWRITTEN handler to submit the form as multipart/form-data
  const handleUpdateFile = async (e) => {
    e.preventDefault();
    if (readOnlyMode) return; // Block in read-only
    if (!selectedFile) return;

    const formData = new FormData();
    // Determine the final category name
    const finalCategory = editFormData.category === 'Others'
      ? editFormData.customCategory
      : editFormData.category;

    formData.append('name', editFormData.name);
    formData.append('category', finalCategory);
    formData.append('fileCreatedAt', editFormData.fileCreatedAt);
    // Append the new file only if one was selected
    if (editFormData.newFile) {
      formData.append('newFile', editFormData.newFile);
    }

    try {
      // Note: We do NOT set the 'Content-Type' header. 
      // The browser will automatically set it to 'multipart/form-data' with the correct boundary.
      const res = await fetch(API_ENDPOINTS.EDIT_FILE(selectedFile.id), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData, // Send the FormData object
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to update file');
      }
      await fetchFiles(token); // Refresh the file list
      handleCloseModals();
    } catch (err) {
      alert(err.message);
    }
  };

  // In FileList.jsx
  // REPLACE your old handleDeleteFile function with this one

  const handleDeleteFile = async () => {
    if (readOnlyMode) return; // Block in read-only
    if (!selectedFile) return;
    try {
      const res = await fetch(API_ENDPOINTS.DELETE_FILE(selectedFile.id), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete file from server');
      setFiles(prevFiles => {
        const newFiles = prevFiles.map(fileGroup => {
          const isTargetGroup = fileGroup.versions.some(v => v.id === selectedFile.id);
          if (isTargetGroup) {
            const updatedVersions = fileGroup.versions.filter(v => v.id !== selectedFile.id);
            if (updatedVersions.length === 0) {
              return null;
            }
            return { ...fileGroup, versions: updatedVersions };
          }
          return fileGroup;
        });
        return newFiles.filter(Boolean);
      });
      handleCloseModals();
    } catch (err) {
      alert(err.message || 'An error occurred while updating the UI.');
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  // Select/Deselect all files
  const toggleSelectAll = () => {
    if (selectedFiles.size === filteredFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredFiles.map(f => f.id)));
    }
  };

  // Send download link(s) to email
  const handleSendDownloadLink = async (fileIds) => {
    if (!fileIds || fileIds.length === 0) {
      alert('Please select at least one file');
      return;
    }

    setDownloadLinkSending(true);
    try {
      const res = await fetch(API_ENDPOINTS.SEND_DOWNLOAD_LINK, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileIds })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send download link');
      }

      alert(data.message);
      setSelectedFiles(new Set()); // Clear selection
      setOpenActionMenuId(null); // Close menu
    } catch (err) {
      alert(err.message || 'Failed to send download link');
    } finally {
      setDownloadLinkSending(false);
    }
  };


  const handleChangePassword = async () => {
    setIsMenuOpen(false);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('You are not logged in.');
        return;
      }

      // Change this line to call the new endpoint
      const res = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      alert('A password reset link has been sent to your registered email address.');

    } catch (err) {
      alert(err.message || 'Failed to send reset link.');
    }
  };
  // Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // ✅ NEW: Semantic search states
  const [semanticSearchResults, setSemanticSearchResults] = useState([]);
  const [isSemanticSearchActive, setIsSemanticSearchActive] = useState(false);

  // Upload validation and progress states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  // --- NEW STATE & REF START ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate(); // Initialize navigate
  const location = useLocation();

  // --- ADD THIS SECTION ---
  const handleIdle = useCallback(() => {
    alert('Session expired due to inactivity. Please log in again.');
    // Clear all session data
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionExpiry');
    // Redirect to login page
    navigate('/login');
  }, [navigate]);

  // Use the idle timer hook. It will call handleIdle after 15 minutes of inactivity.
  useIdleTimer(handleIdle, 15 * 60 * 1000);
  // --- END OF NEW SECTION ---

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(login)
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      setToken(data.token);
      setUserRole(data.role);
      try {
        if (data.token) localStorage.setItem('token', data.token);
        if (data.role) localStorage.setItem('role', data.role);
        if (data.userId) localStorage.setItem('userId', data.userId);
        window.dispatchEvent(new Event('auth-changed'));
      } catch { }
      setLogin({ userId: '', password: '' });
    } catch (err) {
      setError('Login failed. Please check your credentials.');
    }
    setLoading(false);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (signup.password !== signup.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signup.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: signup.userId, password: signup.password })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Signup failed');
      }

      setError('');
      alert('Account created successfully! Please login.');
      setIsSignup(false);
      setSignup({ userId: '', password: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Signup failed. User may already exist.');
    }
    setLoading(false);
  };


  // ✅ NEW STATE for the action dropdown menu
  const [openActionMenuId, setOpenActionMenuId] = useState(null);
  const actionMenuRef = useRef(null);

  // ✅ NEW EFFECT to close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const fetchFiles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(API_ENDPOINTS.FILES, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Handle expired/invalid session: auto-logout and redirect
      if (res.status === 401 || res.status === 403) {
        alert('Your session has expired. Please log in again.');
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('role');
          localStorage.removeItem('userId');
          localStorage.removeItem('sessionExpiry');
        } catch { }
        navigate('/login');
        return;
      }

      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();

      // Debug: Log the data to see what we're getting
      console.log('Files data received:', data);
      data.forEach(fileGroup => {
        console.log(`File: ${fileGroup.name}, isOwner: ${fileGroup.isOwner}, isShared: ${fileGroup.isShared}`);
      });

      // ✅ ADD THIS CHECK
      // Ensure that data is an array before setting the state
      if (Array.isArray(data)) {
        setFiles(data);
      } else {
        console.error("API did not return an array for files:", data);
        setFiles([]); // Default to an empty array to prevent crashes
      }
      // Calculate real-time stats
      // ✅ REPLACED: New, simpler stat calculation
      const totalFiles = data.length;
      const totalStorageKB = data.reduce((sum, fileGroup) => {
        return sum + parseFloat(fileGroup.totalSizeKB || 0);
      }, 0);

      setStats({
        totalFiles: totalFiles,
        storageUsedMB: totalStorageKB / 1024
      });

      const init = {};
      data.forEach(f => { init[f.id] = f.version; });
      setSelectedVersions(init);
    } catch (err) {
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };
  // Fetch user data including 2FA status
  const fetchUserData = async (authToken) => {
    try {
      const res = await fetch(API_ENDPOINTS.USER_STATUS, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!res.ok) throw new Error('Could not fetch user status');
      const data = await res.json();

      setIs2faEnabled(data.isTwoFactorEnabled || false);
    } catch (err) {
      console.error("Failed to fetch 2FA status:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, [token]);

  // Detect if admin came from Teams/Projects context (via ?project=... or ?user=...)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const projectParam = params.get('project');
    const userParam = params.get('user');

    // Remember raw user param for later fuzzy resolution against ownerUserId list
    setContextUserParam(userParam || '');

    if (projectParam) {
      setAdminFilterMode('project');
      setAdminProjectFilter(projectParam);
      setAdminOwnerFilter('');
    } else if (userParam) {
      setAdminFilterMode('owner');
      // Temporary value; will be resolved to actual ownerUserId once files are loaded
      setAdminOwnerFilter(userParam);
      setAdminProjectFilter('');
    } else {
      setAdminFilterMode('owner');
      setAdminOwnerFilter('');
      setAdminProjectFilter('');
    }

    setIsContextView(Boolean(projectParam || userParam));
  }, [location.search]);

  // Once files are loaded, resolve contextUserParam (e.g. "Haroon") to real ownerUserId (e.g. "HaroonMirza")
  useEffect(() => {
    if (!contextUserParam || !files.length) return;

    const owners = Array.from(new Set(files.map(f => f.ownerUserId).filter(Boolean)));

    // First try exact match
    let resolved = owners.find(o => o === contextUserParam);

    // Then try case-insensitive substring match (so "Haroon" matches "HaroonMirza")
    if (!resolved) {
      const needle = contextUserParam.toLowerCase();
      resolved = owners.find(o => o.toLowerCase().includes(needle));
    }

    if (resolved && resolved !== adminOwnerFilter) {
      setAdminOwnerFilter(resolved);
    }
  }, [contextUserParam, files, adminOwnerFilter]);

  // Initialize auth from localStorage on first load so refresh keeps session
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setToken(savedToken);
        fetchUserData(savedToken); // Fetch 2FA status on load
      }
      const savedRole = localStorage.getItem('role');
      const savedUserId = localStorage.getItem('userId');
      const savedDepartment = localStorage.getItem('department');
      if (savedToken) setToken(savedToken);
      if (savedRole) setUserRole(savedRole);
      if (savedUserId) setCurrentUserId(savedUserId);
      if (savedDepartment) setDepartment(savedDepartment);
    } catch { }
  }, []);

  // Set default file created date to today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setFileCreatedAt(today);
  }, []);

  // Function to toggle 2FA
  const handleToggle2FA = async () => {
    const newState = !is2faEnabled;
    setIs2faEnabled(newState); // Optimistic UI update

    try {
      const res = await fetch(API_ENDPOINTS.TOGGLE_2FA, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enable: newState }),
      });
      if (!res.ok) {
        throw new Error('Failed to update 2FA status');
      }
      // Success
    } catch (err) {
      console.error(err);
      setIs2faEnabled(!newState); // Revert on error
      alert('Could not update 2FA status. Please try again.');
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('userId');
      window.dispatchEvent(new Event('auth-changed'));
    } catch { }
    setToken('');
    setUserRole('');
    setCurrentUserId('');
    setIsMenuOpen(false); // Close menu on logout
  };

  // --- NEW EFFECT FOR CLOSING MENU ON OUTSIDE CLICK START ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ✅ NEW: Handle semantic search results
  const handleSemanticSearchResults = useCallback((results) => {
    if (results && results.length > 0) {
      setSemanticSearchResults(results);
      setIsSemanticSearchActive(true);
    } else {
      setSemanticSearchResults([]);
      setIsSemanticSearchActive(false);
    }
  }, []);

  // ✅ NEW: Handle semantic search result click
  const handleSemanticResultClick = useCallback((result) => {
    // Download the file when clicked
    handleDownload(result.fileId, result.filename, null, null);
  }, []);

  const filteredFiles = React.useMemo(() => {
    const isAdmin = userRole === 'admin';

    // ✅ NEW: If semantic search is active, convert results to file format
    if (isSemanticSearchActive && semanticSearchResults.length > 0) {
      // Map semantic search results to file format
      return semanticSearchResults.map(result => {
        // Find the full file object from files array
        const fullFile = files.find(f => f.id === result.fileId ||
          f.versions?.some(v => v.id === result.fileId));

        if (fullFile) {
          return fullFile;
        }

        // If not found, create a minimal file object from search result
        return {
          id: result.fileId,
          name: result.displayName || result.filename,
          category: result.category,
          ownerUserId: result.ownerUserId,
          uploadedAt: result.uploadedAt,
          size: result.size,
          mimetype: result.mimetype,
          versions: [{
            id: result.fileId,
            version: 1,
            size: result.size,
            uploadedAt: result.uploadedAt
          }],
          // Add semantic search metadata
          _semanticScore: result.score,
          _semanticSnippet: result.snippet
        };
      });
    }

    // Start from all files
    let filteredFiles = files;

    // Admin-only filters: by owner or by project (category)
    if (isAdmin) {
      if (adminFilterMode === 'owner' && adminOwnerFilter) {
        filteredFiles = filteredFiles.filter(f => f.ownerUserId === adminOwnerFilter);
      }
      if (adminFilterMode === 'project' && adminProjectFilter) {
        filteredFiles = filteredFiles.filter(f => f.category === adminProjectFilter);
      }
    }

    // Common filters: category + dates
    filteredFiles = filteredFiles.filter(f => {
      if (filterCategory && f.category !== filterCategory) return false;
      if (filterDateFrom || filterDateTo) {
        const fileDate = new Date(f.uploadedAt);
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          if (fileDate < fromDate) return false;
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (fileDate > toDate) return false;
        }
      }
      return true;
    });

    // Step 2: If the search query is empty, return the results from Step 1
    if (!searchQuery.trim()) {
      return filteredFiles;
    }

    // Step 3: Apply fuzzy search on the pre-filtered results
    const fuse = new Fuse(filteredFiles, {
      keys: ['name'],       // The property you want to search
      threshold: 0.4,       // Adjusts the "fuzziness" (0.0 = exact match, 1.0 = match anything)
      includeScore: true,
    });

    const results = fuse.search(searchQuery);

    // Map the results from Fuse.js back to the original file format
    return results.map(result => result.item);

  }, [files, filterCategory, filterDateFrom, filterDateTo, searchQuery, adminOwnerFilter, adminFilterMode, adminProjectFilter, userRole, isSemanticSearchActive, semanticSearchResults]);
  // Get unique categories from files
  const uniqueCategories = [...new Set(files.map(f => f.category))].sort();
  // Get unique owners from files for admin owner filter
  const uniqueOwners = React.useMemo(() => {
    const owners = Array.from(new Set(files.map(f => f.ownerUserId).filter(Boolean)));
    return owners.map(o => ({ userId: o, display: o }));
  }, [files]);

  // Team-specific categories for upload dropdown
  const allCategories = React.useMemo(() => getTeamCategories(department), [department]);

  // Validation function
  const validateUpload = () => {
    const errors = {};

    if (!filesToUpload || filesToUpload.length === 0) {
      errors.file = 'Please select at least one file to upload';
    }

    if (!category || category === '') {
      errors.category = 'Please select a category for the file';
    }



    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Show success notification
  const showSuccessMessage = () => {
    setShowSuccessNotification(true);
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 3000);
  };
  // In FileList.jsx
  // REPLACE your old handleUpload function with this one
  // In FileList.jsx
  // This is the final, merged version of the function

  const handleUpload = async (e) => {
    e.preventDefault();
    if (readOnlyMode) return; // Block in read-only
    if (!validateUpload()) return;
    uploadAbortControllerRef.current = new AbortController();
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    try {
      const totalFiles = filesToUpload.length;
      const loadedArray = new Array(totalFiles).fill(0);
      const totalSize = filesToUpload.reduce((sum, file) => sum + file.size, 0);
      progressIntervalRef.current = setInterval(() => {
        const totalLoaded = loadedArray.reduce((sum, l) => sum + l, 0);
        const totalProgress = Math.min((totalLoaded / totalSize) * 100, 99);
        setUploadProgress(Math.round(totalProgress));
      }, 100);
      const uploadSingle = (file, index) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append('file', file);
          formData.append('compress', compress);
          if (!category) {
            reject(new Error("Category is missing. Please select a category."));
            return;
          }
          formData.append('category', category);
          formData.append('fileCreatedAt', fileCreatedAt);
          xhr.open('POST', API_ENDPOINTS.UPLOAD, true);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              loadedArray[index] = event.loaded;
            }
          });
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              loadedArray[index] = file.size;
              resolve();
            } else {
              reject(new Error(`Upload failed for ${file.name}`));
            }
          });
          xhr.addEventListener('error', () => {
            reject(new Error(`Upload failed for ${file.name}`));
          });
          xhr.addEventListener('abort', () => {
            reject(new Error('Upload was cancelled.'));
          });
          uploadAbortControllerRef.current.signal.addEventListener('abort', () => {
            xhr.abort();
          });
          xhr.send(formData);
        });
      };
      for (let i = 0; i < totalFiles; i++) {
        if (uploadAbortControllerRef.current?.signal.aborted) {
          throw new Error('Upload was cancelled.');
        }
        await uploadSingle(filesToUpload[i], i);
      }
      setUploadProgress(100);
      setFilesToUpload([]);
      setCategory('');
      setCustomCategory('');
      setCompress('none');
      const today = new Date().toISOString().split('T')[0];
      setFileCreatedAt(today);
      if (document.querySelector('input[type="file"]')) {
        document.querySelector('input[type="file"]').value = '';
      }
      showSuccessMessage();
      await fetchFiles();
    } catch (err) {
      if (err.message === 'Upload was cancelled.') {
        setError('Upload was cancelled.');
        console.log('Upload was cancelled by the user.');
      } else {
        setError(err.message || 'An error occurred during upload.');
      }
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setIsUploading(false);
      setUploadProgress(0);
      uploadAbortControllerRef.current = null;
    }
  };
  // In FileList.jsx, with your other style objects
  const cancelBtnStyle = {
    background: '#fee2e2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    padding: '4px 10px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    marginLeft: '16px'
  };

  const handleDownload = async (fileId, name, fileType, version) => {
    setError('');
    try {
      const urlPath = API_ENDPOINTS.DOWNLOAD(fileId, version);
      const res = await fetch(urlPath, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileType ? `${name}.${fileType}` : name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Download failed');
    }
  };

  // Preview file in modal
  const handlePreview = async (fileId, name, fileType, version) => {
    setError('');
    setPreviewLoading(true);
    setIsPreviewModalOpen(true);

    try {
      const urlPath = API_ENDPOINTS.DOWNLOAD(fileId, version);
      const res = await fetch(urlPath, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      setPreviewFileData({
        fileId,
        name,
        fileType,
        version,
        url
      });
    } catch (err) {
      setError('Preview failed');
      setIsPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Close preview modal and clean up blob URL
  const handleClosePreview = useCallback(() => {
    if (previewFileData?.url) {
      window.URL.revokeObjectURL(previewFileData.url);
    }
    setIsPreviewModalOpen(false);
    setPreviewFileData(null);
    setPreviewLoading(false);
  }, [previewFileData]);

  // Handle ESC key to close preview modal
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape' && isPreviewModalOpen) {
        handleClosePreview();
      }
    };
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isPreviewModalOpen, handleClosePreview]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (previewFileData?.url) {
        window.URL.revokeObjectURL(previewFileData.url);
      }
    };
  }, [previewFileData]);


  const handleShareFile = async (fileId) => {
    try {
      const res = await fetch(API_ENDPOINTS.SHARE_FILE(fileId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to share file');
      }

      const data = await res.json();
      setSuccess(`File shared successfully with your team members!`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh the file list to show updated sharing status
      await fetchFiles();

      // Close the action menu
      setOpenActionMenuId(null);

    } catch (err) {
      setError(err.message || 'Failed to share file');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleUnshareFile = async (fileId) => {
    try {
      const res = await fetch(API_ENDPOINTS.UNSHARE_FILE(fileId), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to unshare file');
      }

      const data = await res.json();
      setSuccess('File sharing removed successfully!');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh the file list to show updated sharing status
      await fetchFiles();

      // Close the action menu
      setOpenActionMenuId(null);

    } catch (err) {
      setError(err.message || 'Failed to unshare file');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={brandTitle}>ClearBoard</h1>
          <div style={brandSub}>Secure File Portal</div>
          <div style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>Please choose your department to continue</div>
          <a href="/department" style={{ textDecoration: 'none' }}>
            <button
              disabled={loading}
              style={{ ...primaryBtn, marginTop: 16 }}
            >
              Continue to Department Selection
            </button>
          </a>
          {error && <div style={{ color: 'crimson', marginTop: 10, textAlign: 'center', fontSize: 14 }}>{error}</div>}
        </div>
      </div>
    );
  }

  // Get the first letter of the user ID for the avatar
  const userInitial = currentUserId ? currentUserId.charAt(0) : '?';

  // Show the upload section normally, but hide it when admin is viewing Teams/Projects context
  const showUploadSection = !(userRole === 'admin' && isContextView);

  return (
    <div style={pageStyle}>
      <div style={container}>
        {/* Professional Loading Overlay */}

        {/* Back button for admin when viewing Teams/Projects context */}
        {userRole === 'admin' && isContextView && (
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => navigate('/admin-dashboard')}
              style={{
                ...smallBtn,
                padding: '8px 14px',
                fontSize: 14,
                background: '#e5e7eb',
                color: '#111827',
              }}
            >
              Back to Teams/Projects
            </button>
          </div>
        )}
        {/* Real-time Dashboard Stats */}
        <div style={{ position: 'relative', minHeight: '120px' }}>
          {/* Loading Overlay - Only shows over stats */}
          {loading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
              animation: 'fadeIn 0.3s ease-in-out',
              borderRadius: '14px',
              overflow: 'hidden'
            }}>
              <div style={{
                textAlign: 'center'
              }}>
                <div style={{
                  position: 'relative',
                  width: '60px',
                  height: '60px',
                  margin: '0 auto 8px'
                }}>
                  <svg style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'rotate(-90deg)'
                  }}>
                    <circle cx="30" cy="30" r="26" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle cx="30" cy="30" r="26" fill="none" stroke="url(#gradient-stats-table)" strokeWidth="3" strokeLinecap="round" strokeDasharray="163.36" strokeDashoffset="0" style={{ animation: 'progress 2s ease-in-out infinite' }} />
                    <defs>
                      <linearGradient id="gradient-stats-table" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', animation: 'pulse 2s ease-in-out infinite' }}>📁</div>
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', margin: '0 0 4px 0', animation: 'fadeIn 0.5s ease-in-out 0.2s both' }}>Loading Your Files</h3>
                <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, animation: 'fadeIn 0.5s ease-in-out 0.4s both' }}>Please wait...</p>
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  {[0, 1, 2].map((i) => (<div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite` }} />))}
                </div>
              </div>
              <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } } @keyframes progress { 0% { stroke-dashoffset: 163.36; } 50% { stroke-dashoffset: 40.84; } 100% { stroke-dashoffset: 163.36; } } @keyframes pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 1; } 50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; } } @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-8px); } }`}</style>
            </div>
          )}
          <div style={statsGrid}>
            <div style={statCard}>
              <div style={statTitle}>Total Files</div>
              <div style={statValue}>{stats.totalFiles}</div>
              <div style={statSub}>
                {userRole === 'admin' ? 'All files in system' : 'Your uploaded files'}
              </div>
            </div>
            <div style={statCard}>
              <div style={statTitle}>Storage Used</div>
              <div style={statValue}>{stats.storageUsedMB.toFixed(2)} MB</div>
              <div style={statSub}>
                {stats.totalFiles > 0
                  ? `${(stats.storageUsedMB / stats.totalFiles).toFixed(2)} MB avg per file`
                  : 'No files yet'}
              </div>
            </div>
          </div>
        </div>
        {/* ✅ NEW: Storage Quota Progress Bar */}
        <div className="storage-quota-card">
          <h4>Storage Quota</h4>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${percentageUsed}%` }}></div>
          </div>
          <div className="storage-details">
            <span className="storage-used-text">
              {stats.storageUsedMB.toFixed(2)} MB of {(STORAGE_QUOTA_MB / 1024).toFixed(0)} GB Used
            </span>
            <span className="storage-left-text">
              {spaceLeftGB} GB Left
            </span>
          </div>
        </div>

        {/* Upload Section */}
        {showUploadSection && (
          <div style={{ ...sectionCard, marginBottom: 20, opacity: readOnlyMode ? 0.5 : 1, pointerEvents: readOnlyMode ? 'none' : 'auto' }}>
            <h2 style={{ margin: 0, color: '#1f2a37', display: 'flex', alignItems: 'center' }}>
              Upload a File
              {userRole === 'admin' && <span style={adminBadge}>ADMIN</span>}
              {readOnlyMode && <span style={{ ...adminBadge, background: '#64748b', marginLeft: 8 }}>READ-ONLY</span>}
            </h2>
            {readOnlyMode && (
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 8, marginBottom: 8 }}>
                Uploading is disabled in read-only mode.
              </div>
            )}
            <div style={{ marginTop: 12 }}>
              <div style={uploadGrid}>
                <div>
                  <label style={label}>File</label>
                  <div
                    style={{
                      border: '2px dashed #d1d5db',
                      borderRadius: 10,
                      padding: '14px 12px',
                      textAlign: 'center',
                      backgroundColor: '#f9fafb',
                      transition: 'all 0.25s ease',
                      cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                      position: 'relative',
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      disabled={readOnlyMode}
                      onChange={readOnlyMode ? undefined : (e => {
                        const list = Array.from(e.target.files || []);
                        setFilesToUpload(list);
                        if (validationErrors.file) {
                          setValidationErrors({ ...validationErrors, file: '' });
                        }
                      })}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                      }}
                    />
                    <div style={{ color: '#2563eb', fontWeight: 600, fontSize: 13 }}>
                      Click to upload or drag files
                    </div>
                    <div style={{ color: '#6b7280', fontSize: 10, marginTop: 2 }}>
                      PDF, JPG, PNG, DOCX, XLSX, PPTX etc.
                    </div>
                  </div>
                  {/* File list preview */}
                  {filesToUpload?.length > 0 && (
                    <ul
                      style={{
                        marginTop: 8,
                        background: '#f3f4f6',
                        borderRadius: 6,
                        border: '1px solid #e5e7eb',
                        padding: '6px 8px',
                        maxHeight: 90,
                        overflowY: 'auto',
                        fontSize: 12,
                        color: '#374151',
                      }}
                    >
                      {filesToUpload.map((file, idx) => (
                        <li
                          key={idx}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '2px 0',
                            borderBottom:
                              idx !== filesToUpload.length - 1
                                ? '1px solid #e5e7eb'
                                : 'none',
                          }}
                        >
                          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <span style={{ color: '#9ca3af', marginLeft: 8 }}>
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                          <button
                            onClick={readOnlyMode ? undefined : (() => removeFile(idx))}
                            disabled={readOnlyMode}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#dc2626',
                              cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                              fontSize: 14,
                              fontWeight: 'bold',
                              marginLeft: 8,
                              padding: '2px 4px',
                              borderRadius: 2,
                            }}
                            title="Remove file"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {validationErrors.file && (
                    <div style={{ ...errorText, marginTop: 4 }}>
                      {validationErrors.file}
                    </div>
                  )}
                </div>
                <div>
                  <label style={label}>Category</label>
                  <select
                    value={category}
                    onChange={readOnlyMode ? undefined : (e => {
                      setCategory(e.target.value);
                      if (validationErrors.category) {
                        setValidationErrors({ ...validationErrors, category: '' });
                      }
                    })}
                    style={select}
                    disabled={readOnlyMode}
                  >
                    <option value="" disabled hidden>Select Category</option>
                    {allCategories.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  </select>
                  {validationErrors.category && <div style={errorText}>{validationErrors.category}</div>}

                </div>
                <div>
                  <label style={label}>Compression</label>
                  <select value={compress} onChange={readOnlyMode ? undefined : (e => setCompress(e.target.value))} style={select} disabled={readOnlyMode}>

                    <option value="zip">Zip (Fast, less compressed)</option>
                    <option value="brotli">Brotli (Slow, more compressed)</option>
                  </select>
                </div>
                <div>
                  <label style={label}>File Creation Date</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      position: 'absolute',
                      left: '12px',
                      fontSize: '16px',
                      color: '#6b7280',
                      pointerEvents: 'none',
                      zIndex: 1
                    }}>📅</span>
                    <input
                      type="date"
                      value={fileCreatedAt}
                      onChange={readOnlyMode ? undefined : (e => setFileCreatedAt(e.target.value))}
                      disabled={readOnlyMode}
                      style={{
                        ...input,
                        paddingLeft: '40px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#1f2937',
                        border: '2px solid #e5e7eb',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        outline: 'none',
                        cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                        letterSpacing: '0.01em',
                        lineHeight: '1.5',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
                      }}
                      onFocus={(e) => {
                        if (!readOnlyMode) {
                          e.target.style.borderColor = '#3b82f6';
                          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                        }
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = '#e5e7eb';
                        e.target.style.boxShadow = 'none';
                      }}
                      onMouseEnter={(e) => {
                        if (!readOnlyMode && document.activeElement !== e.target) {
                          e.target.style.borderColor = '#d1d5db';
                          e.target.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!readOnlyMode && document.activeElement !== e.target) {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                    />
                  </div>
                </div>
                <div>
                  <button
                    onClick={readOnlyMode ? undefined : handleUpload}
                    disabled={readOnlyMode || isUploading || filesToUpload.length === 0 || stats.storageUsedMB >= STORAGE_QUOTA_MB}
                    style={smallBtn}
                  >
                    {isUploading ? 'Uploading...' : (filesToUpload.length > 1 ? `Upload ${filesToUpload.length} files` : 'Upload')}
                  </button>
                </div>
              </div>
              {/* Progress Bar */}
              {isUploading && !readOnlyMode && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 500, flexGrow: 1 }}>
                      Uploading {filesToUpload.length > 1 ? `${filesToUpload.length} files` : 'file'}...
                    </span>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                      {uploadProgress}%
                    </span>
                    <button onClick={handleCancelUpload} style={cancelBtnStyle}>
                      Cancel
                    </button>
                  </div>
                  <div style={progressContainer}>
                    <div style={{ ...progressBar, width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          {/* Admin filters: by Owner (Teams path) or by Project (Projects path) */}
          {userRole === 'admin' && adminFilterMode === 'owner' && (
            <div style={{ marginBottom: 12 }}>
              <AdminUserFilter
                users={uniqueOwners}
                selectedUser={adminOwnerFilter}
                onChange={setAdminOwnerFilter}
              />
            </div>
          )}
          {userRole === 'admin' && adminFilterMode === 'project' && (
            <div style={{ marginBottom: 12 }}>
              <label style={label}>Filter by Project</label>
              <select
                value={adminProjectFilter}
                onChange={e => setAdminProjectFilter(e.target.value)}
                style={select}
              >
                <option value="">All Projects</option>
                {ADMIN_PROJECTS.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          )}

          {/* ✨ MODERN 4-COLUMN FILTER GRID ✨ */}
          <div style={{ display: 'grid', marginBottom: 28, gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, alignItems: 'end' }}>
            {/* Category Filter */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                style={{
                  ...select,
                  height: '44px',
                  fontSize: 14,
                  fontWeight: 500,
                  border: '2px solid #e5e7eb',
                  borderRadius: 10,
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#4f46e5';
                  e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">All Categories</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Date From</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: '#9ca3af',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>📅</span>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  style={{
                    ...input,
                    height: '44px',
                    paddingLeft: '44px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Date To Filter */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Date To</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: '#9ca3af',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>📅</span>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  style={{
                    ...input,
                    height: '44px',
                    paddingLeft: '44px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Filename Search */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Search by Filename</label>
              <div style={{ position: 'relative' }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    position: 'absolute',
                    left: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af',
                    pointerEvents: 'none',
                    zIndex: 1
                  }}
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder="Type to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    ...input,
                    height: '44px',
                    paddingLeft: '44px',
                    fontSize: 14,
                    fontWeight: 500,
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fafbfc'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#4f46e5';
                    e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
                    e.target.style.backgroundColor = '#fff';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                    e.target.style.backgroundColor = '#fafbfc';
                  }}
                />
              </div>
            </div>
          </div>

          {/* Filter Status & Clear Button */}
          {(filterCategory || filterDateFrom || filterDateTo || searchQuery) && (
            <div style={{
              marginTop: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: 10,
              border: '1px solid #bae6fd'
            }}>
              <span style={{
                fontSize: 14,
                color: '#0369a1',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Showing {filteredFiles.length} of {files.length} files
              </span>
              <button
                onClick={() => {
                  setFilterCategory('');
                  setFilterDateFrom('');
                  setFilterDateTo('');
                  setSearchQuery('');
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  background: '#0284c7',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(2, 132, 199, 0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#0369a1';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 8px rgba(2, 132, 199, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#0284c7';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 4px rgba(2, 132, 199, 0.2)';
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* ✨ SEMANTIC SEARCH BAR - Shows only when category is selected ✨ */}
        {
          filterCategory && (
            <div style={{
              marginTop: 20,
              padding: '20px',
              background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
              borderRadius: 12,
              border: '2px solid #e9d5ff',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12
              }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'linear-gradient(135deg, #547DED 0%, #547DED 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#547DED',
                    letterSpacing: '-0.01em'
                  }}>
                    Semantic Search in {filterCategory}
                  </h3>

                </div>
              </div>
              <SemanticSearchBar
                onResults={handleSemanticSearchResults}
                onResultClick={handleSemanticResultClick}
                placeholder={`Search "${filterCategory}" by content meaning...`}
                showDropdown={true}
                category={filterCategory}
              />
            </div>
          )
        }

        {/* Semantic Search Results Indicator */}
        {
          isSemanticSearchActive && (
            <div style={{
              marginTop: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
              borderRadius: 4,
              border: '2px solid #c4b5fd',
              boxShadow: '0 2px 8px rgba(56, 206, 233, 0.12)'
            }}>
              <span style={{
                fontSize: 14,
                color: '#547DED',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
                {semanticSearchResults.length} semantic {semanticSearchResults.length === 1 ? 'result' : 'results'} found in {filterCategory}
              </span>
              <button
                onClick={() => {
                  setSemanticSearchResults([]);
                  setIsSemanticSearchActive(false);
                }}
                style={{
                  padding: '7px 16px',
                  borderRadius: 8,
                  background: '#547DED',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 13,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 6px rgba(124, 58, 237, 0.25)',
                  marginLeft: 'auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#547DED';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 4px 10px rgba(58, 186, 237, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#547DED';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 2px 6px rgba(58, 171, 237, 0.25)';
                }}
              >
                Clear Search
              </button>
            </div>
          )
        }
        {
          selectedFiles.size > 0 && (
            <div style={{
              padding: '16px',
              background: '#eff6ff',
              borderRadius: '10px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontWeight: 600, color: '#1e40af' }}>
                {selectedFiles.size} file(s) selected
              </span>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Clear Selection
                </button>
                <button
                  onClick={() => handleSendDownloadLink(Array.from(selectedFiles))}
                  disabled={downloadLinkSending}
                  style={{
                    padding: '8px 16px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: downloadLinkSending ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    opacity: downloadLinkSending ? 0.6 : 1
                  }}
                >
                  📧 {downloadLinkSending ? 'Sending...' : 'Send Download Links to Email'}
                </button>
              </div>
            </div>
          )
        }


        {/* Files Table */}
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
                    onChange={toggleSelectAll}
                    style={{ cursor: 'pointer' }}
                    title="Select all files"
                  />
                </th>
                <th style={thStyle}>File Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Size (KB)</th>
                <th style={thStyle}>Compression</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Version</th>
                {userRole === 'admin' && <th style={thStyle}>Owner</th>}
                <th style={thStyle}>Uploaded</th>
                <th style={thStyle}>Modified</th>
                <th style={thStyle}>File Creation</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {/* First, check if filteredFiles is empty to show the message */}
              {filteredFiles.length === 0 && (
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: 32, color: '#64748b' }} colSpan={userRole === 'admin' ? 12 : 11}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>
                      {filterCategory || filterDateFrom || filterDateTo ? '🔍' : '📂'}
                    </div>
                    {filterCategory || filterDateFrom || filterDateTo
                      ? 'No files match the selected filters'
                      : 'Select a filter above to view files'}
                  </td>
                </tr>
              )}

              {/* Then, map over filteredFiles to render the rows */}
              {filteredFiles.map((fileGroup, idx) => {
                // SAFETY GUARD
                if (!fileGroup.versions || fileGroup.versions.length === 0) {
                  return null;
                }

                const selectedVersionNumber = selectedVersions[fileGroup.id] ?? fileGroup.versions[0].version;
                const displayedVersion = fileGroup.versions.find(v => v.version === selectedVersionNumber) || fileGroup.versions[0];

                return (
                  <tr key={fileGroup.id} style={zebra(idx)}>
                    <td style={tdStyle}>
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(displayedVersion.id)}
                        onChange={() => toggleFileSelection(displayedVersion.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{ cursor: 'pointer', color: '#2563eb', textDecoration: 'underline' }}
                          onClick={() => handlePreview(displayedVersion.id, fileGroup.name, displayedVersion.fileType, displayedVersion.version)}
                          title="Click to preview"
                        >
                          {fileGroup.name}
                        </span>
                        {fileGroup.isShared && (
                          <span style={{
                            ...pill,
                            background: '#dbeafe',
                            color: '#1e40af',
                            fontSize: '10px',
                            padding: '2px 6px'
                          }}>SHARED</span>
                        )}
                        {!fileGroup.isOwner && (
                          <span style={{
                            ...pill,
                            background: '#fef3c7',
                            color: '#92400e',
                            fontSize: '10px',
                            padding: '2px 6px'
                          }}>TEAM FILE</span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}><span style={{ ...pill, background: '#eef2ff', color: '#4338ca' }}>{displayedVersion.fileType || 'N/A'}</span></td>
                    <td style={tdStyle}>{displayedVersion.size}</td>
                    <td style={tdStyle}><span style={{ ...pill, background: displayedVersion.compressionType === 'none' ? '#f1f5f9' : '#dcfce7', color: displayedVersion.compressionType === 'none' ? '#64748b' : '#166534' }}>{displayedVersion.compressionType}</span></td>
                    <td style={tdStyle}>{fileGroup.category}</td>
                    <td style={tdStyle}>
                      <select
                        value={selectedVersionNumber}
                        onChange={e => setSelectedVersions({ ...selectedVersions, [fileGroup.id]: Number(e.target.value) })}
                        style={{ ...select, padding: '4px 8px', width: 70, fontSize: 12, height: 30 }}
                      >
                        {fileGroup.versions.map(v => <option key={v.version} value={v.version}>v{v.version}</option>)}
                      </select>
                    </td>
                    {userRole === 'admin' && <td style={tdStyle}>{fileGroup.ownerUserId}</td>}
                    <td style={tdStyle}>{displayedVersion.uploadedAt ? new Date(displayedVersion.uploadedAt).toLocaleDateString('en-GB') : '-'}</td>
                    <td style={tdStyle}>{displayedVersion.modifiedAt ? new Date(displayedVersion.modifiedAt).toLocaleDateString('en-GB') : '-'}</td>
                    <td style={tdStyle}>{displayedVersion.fileCreatedAt ? new Date(displayedVersion.fileCreatedAt).toLocaleDateString('en-GB') : '-'}</td>
                    <td style={tdStyle}>
                      <div className="actions-container" ref={openActionMenuId === fileGroup.id ? actionMenuRef : null}>
                        <button className="actions-trigger"
                          onClick={readOnlyMode ? undefined : (() => setOpenActionMenuId(openActionMenuId === fileGroup.id ? null : fileGroup.id))}
                          disabled={readOnlyMode}
                          style={readOnlyMode ? { cursor: 'not-allowed', opacity: 0.6 } : {}}>
                          ...
                        </button>
                        {openActionMenuId === fileGroup.id && (
                          <div className="actions-dropdown">
                            <button className="actions-item" onClick={() => handlePreview(displayedVersion.id, fileGroup.name, displayedVersion.fileType, displayedVersion.version)}>👁️ Preview</button>
                            <button
                              className="actions-item"
                              onClick={() => handleSendDownloadLink([displayedVersion.id])}
                              disabled={downloadLinkSending}
                            >
                              📧 {downloadLinkSending ? 'Sending...' : 'Send Download Link'}
                            </button>
                            {/* {!readOnlyMode && fileGroup.isOwner && (
                              fileGroup.isShared ?
                                <button className="actions-item" onClick={() => handleUnshareFile(displayedVersion.id)}>Unshare</button>
                                :
                                <button className="actions-item" onClick={() => handleShareFile(displayedVersion.id)}>Share with Team</button>
                            )} */}
                            {!readOnlyMode && <button className="actions-item" onClick={() => handleOpenEditModal(fileGroup)}>Edit Details</button>}
                            {!readOnlyMode && <button className="actions-item delete" onClick={() => handleOpenDeleteModal(displayedVersion)}>Delete File</button>}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {/* ✅ NEW MODALS (place them at the end of the main div) */}

      {/* ✅ UPDATED EDIT MODAL */}
      {isEditModalOpen && !readOnlyMode && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit File</h3>
            </div>
            <form onSubmit={handleUpdateFile} encType="multipart/form-data" className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <label style={label}>File Name (without extension)</label>
                <input name="name" value={editFormData.name} onChange={handleEditFormChange} style={input} required disabled={readOnlyMode} />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={label}>Category</label>
                <select name="category" value={editFormData.category} onChange={handleEditFormChange} style={select} disabled={readOnlyMode}>
                  {allCategories.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
              {editFormData.category === 'Others' && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={label}>Custom Category Name</label>
                  <input name="customCategory" value={editFormData.customCategory} onChange={handleEditFormChange} style={input} required disabled={readOnlyMode} />
                </div>
              )}
              <div style={{ marginBottom: '16px' }}>
                <label style={label}>File Creation Date</label>
                <input
                  type="date"
                  name="fileCreatedAt"
                  value={editFormData.fileCreatedAt}
                  onChange={handleEditFormChange}
                  style={input}
                  disabled={readOnlyMode}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={label}>Replace File (Optional)</label>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px 0' }}>Upload a new file to create a new version.</p>
                <input type="file" name="newFile" onChange={handleEditFormChange} style={input} disabled={readOnlyMode} />
              </div>
              <div className="modal-footer">
                <button type="button" className="modal-button cancel" onClick={handleCloseModals}>Cancel</button>
                <button type="submit" className="modal-button primary" disabled={readOnlyMode}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && !readOnlyMode && (
        <div className="modal-overlay" onClick={handleCloseModals}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete the file <span className="highlight">"{selectedFile?.name}.{selectedFile?.fileType}"</span>?
              </p>
              <p style={{ fontSize: '13px', color: '#dc2626' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel" onClick={handleCloseModals}>Cancel</button>
              <button className="modal-button delete" onClick={handleDeleteFile} disabled={readOnlyMode}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Success Notification */}
      {showSuccessNotification && (
        <div style={successNotificationVisible}>
          <span>✅</span>
          <span>File uploaded successfully!</span>
        </div>
      )}

      {/* Success Message for Sharing */}
      {success && (
        <div style={successNotificationVisible}>
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          ...successNotification,
          background: '#dc2626',
          transform: 'translateX(0)'
        }}>
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* ✅ FILE PREVIEW MODAL */}
      {isPreviewModalOpen && (
        <div
          className="preview-modal-overlay"
          onClick={handleClosePreview}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
        >
          <div
            className="preview-modal-content"
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '95vw',
              maxHeight: '95vh',
              width: '100%',
              background: '#1a1a1a',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              background: '#252525',
              borderBottom: '1px solid #333',
              flexShrink: 0
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#fff',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {previewFileData?.name || 'Preview'}
                  {previewFileData?.fileType && (
                    <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>
                      .{previewFileData.fileType}
                    </span>
                  )}
                </h3>
              </div>
              <button
                onClick={handleClosePreview}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                  marginLeft: '16px',
                  width: '32px',
                  height: '32px'
                }}
                onMouseEnter={(e) => e.target.style.background = '#3a3a3a'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}
                title="Close (Esc)"
              >
                ×
              </button>
            </div>

            {/* Preview Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              background: '#1a1a1a',
              position: 'relative',
              minHeight: '400px'
            }}>
              {previewLoading ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff'
                }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #333',
                    borderTopColor: '#3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginBottom: '16px'
                  }}></div>
                  <p style={{ margin: 0, color: '#9ca3af' }}>Loading preview...</p>
                </div>
              ) : previewFileData?.url ? (
                (() => {
                  const fileType = previewFileData.fileType?.toLowerCase();

                  // PDF Preview
                  if (fileType === 'pdf') {
                    return (
                      <iframe
                        src={previewFileData.url}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: '600px',
                          border: 'none',
                          background: '#2a2a2a'
                        }}
                        title={`Preview of ${previewFileData.name}`}
                      />
                    );
                  }

                  // Image Preview
                  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(fileType)) {
                    return (
                      <img
                        src={previewFileData.url}
                        alt={previewFileData.name}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                        }}
                      />
                    );
                  }

                  // Text files
                  if (['txt', 'json', 'xml', 'csv', 'md', 'js', 'jsx', 'ts', 'tsx', 'css', 'html'].includes(fileType)) {
                    return (
                      <iframe
                        src={previewFileData.url}
                        style={{
                          width: '100%',
                          height: '100%',
                          minHeight: '400px',
                          border: 'none',
                          background: '#1a1a1a',
                          color: '#fff'
                        }}
                        title={`Preview of ${previewFileData.name}`}
                      />
                    );
                  }

                  // Video files
                  if (['mp4', 'webm', 'ogg', 'mov'].includes(fileType)) {
                    return (
                      <video
                        src={previewFileData.url}
                        controls
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          borderRadius: '8px'
                        }}
                      >
                        Your browser does not support video playback.
                      </video>
                    );
                  }

                  // Audio files
                  if (['mp3', 'wav', 'ogg', 'm4a'].includes(fileType)) {
                    return (
                      <div style={{
                        width: '100%',
                        maxWidth: '600px',
                        padding: '40px',
                        background: '#252525',
                        borderRadius: '12px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          fontSize: '48px',
                          marginBottom: '24px'
                        }}>🎵</div>
                        <h4 style={{ color: '#fff', marginBottom: '16px' }}>
                          {previewFileData.name}
                        </h4>
                        <audio
                          src={previewFileData.url}
                          controls
                          style={{
                            width: '100%',
                            marginBottom: '16px'
                          }}
                        >
                          Your browser does not support audio playback.
                        </audio>
                        <button
                          onClick={() => handleDownload(previewFileData.fileId, previewFileData.name, previewFileData.fileType, previewFileData.version)}
                          style={{
                            padding: '10px 20px',
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px'
                          }}
                        >
                          Download File
                        </button>
                      </div>
                    );
                  }

                  // Unsupported file types - show download option
                  return (
                    <div style={{
                      textAlign: 'center',
                      padding: '60px 40px',
                      color: '#fff'
                    }}>
                      <div style={{
                        fontSize: '64px',
                        marginBottom: '24px'
                      }}>📄</div>
                      <h3 style={{
                        color: '#fff',
                        marginBottom: '12px',
                        fontSize: '20px'
                      }}>
                        Preview not available
                      </h3>
                      <p style={{
                        color: '#9ca3af',
                        marginBottom: '24px',
                        fontSize: '14px'
                      }}>
                        This file type cannot be previewed in the browser.
                      </p>
                      <button
                        onClick={() => {
                          handleDownload(previewFileData.fileId, previewFileData.name, previewFileData.fileType, previewFileData.version);
                          handleClosePreview();
                        }}
                        style={{
                          padding: '12px 24px',
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: '15px',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                        onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                      >
                        Download File
                      </button>
                    </div>
                  );
                })()
              ) : (
                <div style={{
                  textAlign: 'center',
                  color: '#9ca3af'
                }}>
                  <p>No preview available</p>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {previewFileData && !previewLoading && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                padding: '16px 20px',
                background: '#252525',
                borderTop: '1px solid #333',
                flexShrink: 0
              }}>
                <button
                  onClick={() => {
                    handleDownload(previewFileData.fileId, previewFileData.name, previewFileData.fileType, previewFileData.version);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '14px',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#2563eb'}
                  onMouseLeave={(e) => e.target.style.background = '#3b82f6'}
                >
                  <span>⬇️</span>
                  <span>Download</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add CSS animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default FileList;
