import React, { useState, useEffect, useRef  } from 'react';
import { API_ENDPOINTS } from '../utils/api';
import '../styles/Dashboard.css'; // Import the new CSS file
import '../styles/Modal.css'; // The new modal styles

const CATEGORY_OPTIONS = [
  'TechResearch',
  'BusResearch',
  'Others',
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
const uploadGrid = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 260px) minmax(160px, 220px) auto', gap: 12, alignItems: 'end' };
const select = { ...input };
const smallBtn = { padding: '12px 18px', borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' };

const statsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 30 };
const statCard = { ...sectionCard, padding: 24 };
const statTitle = { fontSize: 14, color: '#64748b', fontWeight: 600, marginBottom: 8 };
const statValue = { fontSize: 32, fontWeight: 800, color: '#1f2a37', marginBottom: 4 };
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

function FileList() {
  const STORAGE_QUOTA_MB = 5 * 1024; // 5GB in MB
  const uploadAbortControllerRef = useRef(null);
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [login, setLogin] = useState({ userId: '', password: '' });
  const [signup, setSignup] = useState({ userId: '', password: '', confirmPassword: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filesToUpload, setFilesToUpload] = useState([]);
  const [compress, setCompress] = useState('none');
  const [category, setCategory] = useState('Others');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedVersions, setSelectedVersions] = useState({});
  const [is2faEnabled, setIs2faEnabled] = useState(false); // State for 2FA toggle
  // Real-time Stats
  const [stats, setStats] = useState({ totalFiles: 0, storageUsedKB: 0, storageUsedMB: 0 });
  const [currentUserId, setCurrentUserId] = useState('');
  const [success, setSuccess] = useState('');
// In FileList.jsx
// ✅ --- NEW STATES FOR MODALS & ACTIONS ---
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null); // File to be edited/deleted
    // ✅ UPDATED state for the edit form
    const [editFormData, setEditFormData] = useState({
        name: '',
        category: '',
        customCategory: '',
        newFile: null,
    });
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
        setSelectedFile(file);
        // Check if the file's category is one of the standard options
        const isStandardCategory = CATEGORY_OPTIONS.includes(file.category);
        setEditFormData({
            name: file.name,
            category: isStandardCategory ? file.category : 'Others',
            customCategory: isStandardCategory ? '' : file.category,
            newFile: null,
        });
        setIsEditModalOpen(true);
    };

    const handleOpenDeleteModal = (file) => {
        setSelectedFile(file);
        setIsDeleteModalOpen(true);
    };

    const handleCancelUpload = () => {
    if (uploadAbortControllerRef.current) {
        uploadAbortControllerRef.current.abort();
        console.log("Upload cancelled by user.");
    }
};

    const handleCloseModals = () => {
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedFile(null);
    };

    // ✅ UPDATED handler to manage form changes (including the file input)
    const handleEditFormChange = (e) => {
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
        if (!selectedFile) return;

        const formData = new FormData();
        
        // Determine the final category name
        const finalCategory = editFormData.category === 'Others' 
            ? editFormData.customCategory 
            : editFormData.category;

        formData.append('name', editFormData.name);
        formData.append('category', finalCategory);
        
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
    if (!selectedFile) return;

    try {
        const res = await fetch(API_ENDPOINTS.DELETE_FILE(selectedFile.id), {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to delete file from server');
        
        // This is the new, correct logic for updating the UI
        setFiles(prevFiles => {
            // Use .map to create a new array
            const newFiles = prevFiles.map(fileGroup => {
                // Check if this is the group we need to modify
                const isTargetGroup = fileGroup.versions.some(v => v.id === selectedFile.id);

                if (isTargetGroup) {
                    // Filter out the deleted version
                    const updatedVersions = fileGroup.versions.filter(v => v.id !== selectedFile.id);
                    
                    // If no versions are left, this group should be removed
                    if (updatedVersions.length === 0) {
                        return null; 
                    }
                    
                    // Otherwise, return the group with the updated versions list
                    return { ...fileGroup, versions: updatedVersions };
                }
                
                // If it's not the target group, return it unchanged
                return fileGroup;
            });

            // Filter out any groups that were set to null (i.e., are now empty)
            return newFiles.filter(Boolean);
        });

        handleCloseModals();
    } catch (err) {
        alert(err.message || 'An error occurred while updating the UI.');
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
  
  // Upload validation and progress states
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  // --- NEW STATE & REF START ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
      } catch {}
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
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      
      // Debug: Log the data to see what we're getting
      console.log('Files data received:', data);
      data.forEach(fileGroup => {
        console.log(`File: ${fileGroup.name}, isOwner: ${fileGroup.isOwner}, isShared: ${fileGroup.isShared}`);
      });
      
      setFiles(data);
      
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
      if (savedToken) setToken(savedToken);
      if (savedRole) setUserRole(savedRole);
      if (savedUserId) setCurrentUserId(savedUserId);
    } catch {}
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
    } catch {}
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

  // Filter files based on selected criteria
  const filteredFiles = files.filter(f => {
    // Only show files if at least one filter is applied
    const hasFilter = filterCategory || filterDateFrom || filterDateTo;
    if (!hasFilter) return false;

    // Category filter
    if (filterCategory && f.category !== filterCategory) return false;

    // Date filter
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

  // Get unique categories from files
  const uniqueCategories = [...new Set(files.map(f => f.category))].sort();

  // Validation function
  const validateUpload = () => {
    const errors = {};
    
    if (!filesToUpload || filesToUpload.length === 0) {
      errors.file = 'Please select at least one file to upload';
    }
    
    if (!category || category === '') {
      errors.category = 'Please select a category for the file';
    }
    
    if (category === 'OtherText' && !customCategory.trim()) {
      errors.customCategory = 'Please enter a custom category name';
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
    if (!validateUpload()) return;

    // From the new code: Create AbortController for cancellation
    uploadAbortControllerRef.current = new AbortController();
    
    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    
    try {
        const total = filesToUpload.length;
        for (let i = 0; i < total; i++) {
            const file = filesToUpload[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('compress', compress);

            // From your original code: Correctly determines the final category
            const finalCategory = category === 'OtherText' ? customCategory.trim() : category;
            if (!finalCategory) {
                throw new Error("Category is missing. Please select or type a category.");
            }
            formData.append('category', finalCategory);

            // Fetch request with the cancellation signal
            const res = await fetch(API_ENDPOINTS.UPLOAD, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
                signal: uploadAbortControllerRef.current.signal,
            });

            if (!res.ok) throw new Error(`Upload failed for ${file.name}`);
            
            // Simple progress update
            setUploadProgress(Math.round(((i + 1) / total) * 100));
        }

        // From your original code: Reset form and refresh data on success
        setFilesToUpload([]);
        setCategory('Others');
        setCustomCategory('');
        setCompress('none');
        if(document.querySelector('input[type="file"]')) {
            document.querySelector('input[type="file"]').value = '';
        }
        showSuccessMessage();
        await fetchFiles(); // Assuming fetchFiles is defined in your component

    } catch (err) {
        // From the new code: Handles cancellation error
        if (err.name === 'AbortError') {
            setError('Upload was cancelled.');
            console.log('Upload was cancelled by the user.');
        } else {
            setError(err.message || 'An error occurred during upload.');
        }
    } finally {
        // From the new code: Cleanup logic
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

  return (
    <div style={pageStyle}>
      <div style={container}>
        {/* --- MODIFIED HEADER / WELCOME BANNER START --- */}
        <div style={{ ...sectionCard, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20, background: 'linear-gradient(180deg,#eef2ff,#ffffff)' }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: '#1f2a37' }}>
              File Dashboard
            </div>
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
              Your secure workspace is ready.
            </div>
          </div>

          {/* User Profile Dropdown Menu */}


        </div>
        {/* Real-time Dashboard Stats */}
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
        {/* ✅ NEW: Storage Quota Progress Bar */}
<div className="storage-quota-card">
    <h4>Storage Quota</h4>
    <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${percentageUsed}%` }}></div>
    </div>
    <div className="storage-details">
        <span className="storage-used-text">
            {stats.storageUsedMB.toFixed(2)} MB of 5 GB Used
        </span>
        <span className="storage-left-text">
            {spaceLeftGB} GB Left
        </span>
    </div>
</div>
        
        {/* Upload Section */}
        <div style={{ ...sectionCard, marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#1f2a37', display: 'flex', alignItems: 'center' }}>
            Upload a File
            {userRole === 'admin' && <span style={adminBadge}>ADMIN</span>}
          </h2>
          <div style={{ marginTop: 12 }}>
            <div style={uploadGrid}>
              <div>
                <label style={label}>File</label>
                <input 
                  type="file" 
                  multiple
                  onChange={e => {
                    const list = Array.from(e.target.files || []);
                    setFilesToUpload(list);
                    if (validationErrors.file) {
                      setValidationErrors({ ...validationErrors, file: '' });
                    }
                  }} 
                  style={input} 
                />
                {validationErrors.file && <div style={errorText}>{validationErrors.file}</div>}
              </div>
              <div>
                <label style={label}>Category</label>
                <select 
                  value={category} 
                  onChange={e => {
                    setCategory(e.target.value);
                    if (validationErrors.category) {
                      setValidationErrors({ ...validationErrors, category: '' });
                    }
                  }} 
                  style={select}
                >
                  <option value="">Select Category</option>
                  {CATEGORY_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  <option value="OtherText">Other (type below)</option>
                </select>
                {validationErrors.category && <div style={errorText}>{validationErrors.category}</div>}
                {category === 'OtherText' && (
                  <div>
                    <input 
                      type="text" 
                      placeholder="Custom category" 
                      value={customCategory} 
                      onChange={e => {
                        setCustomCategory(e.target.value);
                        if (validationErrors.customCategory) {
                          setValidationErrors({ ...validationErrors, customCategory: '' });
                        }
                      }} 
                      style={{ ...input, marginTop: 8 }} 
                    />
                    {validationErrors.customCategory && <div style={errorText}>{validationErrors.customCategory}</div>}
                  </div>
                )}
              </div>
              <div>
                <label style={label}>Compression</label>
                <select value={compress} onChange={e => setCompress(e.target.value)} style={select}>
                  <option value="none">No Compression</option>
                  <option value="zip">Zip</option>
                  <option value="brotli">Brotli</option>
                </select>
              </div>
              <div>
<button 
    onClick={handleUpload} 
    
    // ✅ CHANGED: Add the new condition here
    disabled={isUploading || filesToUpload.length === 0 || stats.storageUsedMB >= STORAGE_QUOTA_MB} 
    
    style={smallBtn}
>
                  {isUploading ? 'Uploading...' : (filesToUpload.length > 1 ? `Upload ${filesToUpload.length} files` : 'Upload')}
                </button>
              </div>
            </div>
            
            {/* Progress Bar */}
            {isUploading && (
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>Uploading {filesToUpload.length > 1 ? `${filesToUpload.length} files` : 'file'}...</span>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{Math.round(uploadProgress)}%</span>
                                  {/* ✅ NEW CANCEL BUTTON */}
                <button onClick={handleCancelUpload} style={cancelBtnStyle}>
                    Cancel
                </button>
                </div>
                <div style={progressContainer}>
                  <div style={{ ...progressBar, width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Section */}
        <div style={{ ...sectionCard, marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#1f2a37', display: 'flex', alignItems: 'center' }}>
            Filter Files
          </h2>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div>
                <label style={label}>Category</label>
                <select 
                  value={filterCategory} 
                  onChange={e => setFilterCategory(e.target.value)} 
                  style={select}
                >
                  <option value="" disabled hidden>Choose a Category</option>
                  {uniqueCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={label}>Date From</label>
                <input 
                  type="date" 
                  value={filterDateFrom} 
                  onChange={e => setFilterDateFrom(e.target.value)} 
                  style={input} 
                />
              </div>
              <div>
                <label style={label}>Date To</label>
                <input 
                  type="date" 
                  value={filterDateTo} 
                  onChange={e => setFilterDateTo(e.target.value)} 
                  style={input} 
                />
              </div>
            </div>
            {(filterCategory || filterDateFrom || filterDateTo) && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: '#64748b' }}>
                  Showing {filteredFiles.length} of {files.length} files
                </span>
                <button
                  onClick={() => {
                    setFilterCategory('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  style={{ ...toggleBtn, marginTop: 0, fontSize: 13 }}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>


        {/* Files Table */}
        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>File Name</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Size (KB)</th>
                <th style={thStyle}>Compression</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Version</th>
                {userRole === 'admin' && <th style={thStyle}>Owner</th>}
                <th style={thStyle}>Uploaded</th>
                <th style={thStyle}>Modified</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
           <tbody>
    {/* First, check if filteredFiles is empty to show the message */}
    {filteredFiles.length === 0 && (
        <tr>
            <td style={{ ...tdStyle, textAlign: 'center', padding: 32, color: '#64748b' }} colSpan={userRole === 'admin' ? 10 : 9}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{fileGroup.name}</span>
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
                <td style={tdStyle}>
                    <div className="actions-container" ref={openActionMenuId === fileGroup.id ? actionMenuRef : null}>
                        <button className="actions-trigger" onClick={() => setOpenActionMenuId(openActionMenuId === fileGroup.id ? null : fileGroup.id)}>...</button>
                        {openActionMenuId === fileGroup.id && (
                            <div className="actions-dropdown">
                                <button className="actions-item" onClick={() => handleDownload(displayedVersion.id, fileGroup.name, displayedVersion.fileType)}>Download</button>
                                {fileGroup.isOwner && (
                                    fileGroup.isShared ? 
                                        <button className="actions-item" onClick={() => handleUnshareFile(displayedVersion.id)}>Unshare</button>
                                        : 
                                        <button className="actions-item" onClick={() => handleShareFile(displayedVersion.id)}>Share with Team</button>
                                )}
                                <button className="actions-item" onClick={() => handleOpenEditModal(fileGroup)}>Edit Details</button>
                                <button className="actions-item delete" onClick={() => handleOpenDeleteModal(displayedVersion)}>Delete File</button>
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
            {isEditModalOpen && (
                <div className="modal-overlay" onClick={handleCloseModals}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Edit File</h3>
                        </div>
                        {/* The form now uses the correct encoding type for file uploads */}
                        <form onSubmit={handleUpdateFile} encType="multipart/form-data" className="modal-body">
                            <div style={{ marginBottom: '16px' }}>
                                <label style={label}>File Name (without extension)</label>
                                <input name="name" value={editFormData.name} onChange={handleEditFormChange} style={input} required />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={label}>Category</label>
                                <select name="category" value={editFormData.category} onChange={handleEditFormChange} style={select}>
                                    {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                            </div>

                            {/* Conditional input for "Others" category */}
                            {editFormData.category === 'Others' && (
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={label}>Custom Category Name</label>
                                    <input name="customCategory" value={editFormData.customCategory} onChange={handleEditFormChange} style={input} required />
                                </div>
                            )}

                            <div style={{ marginBottom: '16px' }}>
                                <label style={label}>Replace File (Optional)</label>
                                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 8px 0' }}>Upload a new file to create a new version.</p>
                                <input type="file" name="newFile" onChange={handleEditFormChange} style={input} />
                            </div>
                            
                            <div className="modal-footer">
                                <button type="button" className="modal-button cancel" onClick={handleCloseModals}>Cancel</button>
                                <button type="submit" className="modal-button primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
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
                            <button className="modal-button delete" onClick={handleDeleteFile}>Delete</button>
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
    </div>
  );
}

export default FileList;