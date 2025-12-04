import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIdleTimer } from '../hooks/useIdleTimer';
import Fuse from 'fuse.js';
import '../styles/FileList.css';
import '../styles/Dashboard.css';
import '../styles/Modal.css';

// File type icons mapping
const FILE_TYPE_ICONS = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    xls: '📊',
    xlsx: '📊',
    ppt: '📽️',
    pptx: '📽️',
    jpg: '🖼️',
    jpeg: '🖼️',
    png: '🖼️',
    gif: '🖼️',
    mp4: '🎥',
    mp3: '🎵',
    zip: '📦',
    txt: '📃',
    default: '📁'
};

// Get file type icon
const getFileTypeIcon = (fileType) => {
    return FILE_TYPE_ICONS[fileType?.toLowerCase()] || FILE_TYPE_ICONS.default;
};

// Generate thumbnail background - clean white with subtle border
const getThumbnailGradient = (fileType) => {
    // Return clean white background for all file types
    return '#ffffff';
};

function FacetedFileList() {
    const [token, setToken] = useState('');
    const [userRole, setUserRole] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');
    const [department, setDepartment] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Filter states
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [filterFileType, setFilterFileType] = useState('');

    // Stats
    const [stats, setStats] = useState({ totalFiles: 0, storageUsedMB: 0 });

    // Upload modal states
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [compress, setCompress] = useState('none');
    const [category, setCategory] = useState('');
    const [fileCreatedAt, setFileCreatedAt] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [validationErrors, setValidationErrors] = useState({});
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const uploadAbortControllerRef = useRef(null);
    const progressIntervalRef = useRef(null);

    const navigate = useNavigate();
    const location = useLocation();

    // Idle timer
    const handleIdle = useCallback(() => {
        alert('Session expired due to inactivity. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        localStorage.removeItem('sessionExpiry');
        navigate('/login');
    }, [navigate]);

    useIdleTimer(handleIdle, 15 * 60 * 1000);

    // Fetch files
    const fetchFiles = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const res = await fetch(API_ENDPOINTS.FILES, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.status === 401 || res.status === 403) {
                alert('Your session has expired. Please log in again.');
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                localStorage.removeItem('userId');
                localStorage.removeItem('sessionExpiry');
                navigate('/login');
                return;
            }

            if (!res.ok) throw new Error('Failed to fetch files');
            const data = await res.json();

            if (Array.isArray(data)) {
                setFiles(data);
                const totalFiles = data.length;
                const totalStorageKB = data.reduce((sum, fileGroup) => {
                    return sum + parseFloat(fileGroup.totalSizeKB || 0);
                }, 0);

                setStats({
                    totalFiles: totalFiles,
                    storageUsedMB: totalStorageKB / 1024
                });
            } else {
                console.error("API did not return an array for files:", data);
                setFiles([]);
            }
        } catch (err) {
            setError('Failed to fetch files');
        } finally {
            setLoading(false);
        }
    };

    // Initialize auth
    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedRole = localStorage.getItem('role');
        const savedUserId = localStorage.getItem('userId');
        const savedDepartment = localStorage.getItem('department');

        if (savedToken) setToken(savedToken);
        if (savedRole) setUserRole(savedRole);
        if (savedUserId) setCurrentUserId(savedUserId);
        if (savedDepartment) setDepartment(savedDepartment);
    }, []);

    useEffect(() => {
        fetchFiles();
    }, [token]);

    // Set default file created date to today
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setFileCreatedAt(today);
    }, []);

    // Team categories
    const TEAM_CATEGORIES = {
        'Software Development': ['WebDev Assets', 'General Research', 'Project Demo', 'Source Code'],
        'Business Development': ['Websites', 'Software', 'Dashboards', 'Financial Research', 'Company Research', 'Graphic Design', 'Storage'],
        'Data and Research Analyst': ['WebDev Assets', 'General Research', 'Project Demo', 'Source Code'],
        'Admin': []
    };

    TEAM_CATEGORIES['Admin'] = Array.from(new Set([
        ...TEAM_CATEGORIES['Software Development'],
        ...TEAM_CATEGORIES['Business Development'],
        ...TEAM_CATEGORIES['Data and Research Analyst'],
    ]));

    const getTeamCategories = (dept) => {
        return TEAM_CATEGORIES[dept] || [];
    };

    // Team-specific categories for upload dropdown
    const allCategories = React.useMemo(() => getTeamCategories(department), [department]);

    // Get unique categories
    const uniqueCategories = [...new Set(files.map(f => f.category))].sort();

    // Get unique file types
    const uniqueFileTypes = [...new Set(
        files.flatMap(f => f.versions?.map(v => v.fileType) || [])
    )].filter(Boolean).sort();

    // Filtered files
    const filteredFiles = React.useMemo(() => {
        let result = files;

        // Apply category filter
        if (filterCategory) {
            result = result.filter(f => f.category === filterCategory);
        }

        // Apply file type filter
        if (filterFileType) {
            result = result.filter(f =>
                f.versions?.some(v => v.fileType === filterFileType)
            );
        }

        // Apply date filters
        if (filterDateFrom || filterDateTo) {
            result = result.filter(f => {
                const fileDate = new Date(f.versions?.[0]?.uploadedAt);
                if (filterDateFrom) {
                    const fromDate = new Date(filterDateFrom);
                    if (fileDate < fromDate) return false;
                }
                if (filterDateTo) {
                    const toDate = new Date(filterDateTo);
                    toDate.setHours(23, 59, 59, 999);
                    if (fileDate > toDate) return false;
                }
                return true;
            });
        }

        // Apply search
        if (searchQuery.trim()) {
            const fuse = new Fuse(result, {
                keys: ['name'],
                threshold: 0.4,
                includeScore: true,
            });
            const searchResults = fuse.search(searchQuery);
            result = searchResults.map(r => r.item);
        }

        return result;
    }, [files, filterCategory, filterFileType, filterDateFrom, filterDateTo, searchQuery]);

    // Clear all filters
    const clearFilters = () => {
        setFilterCategory('');
        setFilterFileType('');
        setFilterDateFrom('');
        setFilterDateTo('');
        setSearchQuery('');
    };

    // Preview file in browser
    const handlePreview = async (fileId, name, fileType) => {
        try {
            const res = await fetch(API_ENDPOINTS.DOWNLOAD(fileId), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Preview failed');
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);

            // Open in new tab for preview
            window.open(url, '_blank');

            // Clean up after a delay
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (err) {
            setError('Preview failed');
        }
    };

    // Download file (keep for download button)
    const handleDownload = async (fileId, name, fileType) => {
        try {
            const res = await fetch(API_ENDPOINTS.DOWNLOAD(fileId), {
                headers: { Authorization: `Bearer ${token}` }
            });
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

    // Handle upload
    const handleUpload = async (e) => {
        e.preventDefault();
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

                    // IMPORTANT: Append fields BEFORE file so server receives them first
                    formData.append('compress', compress);
                    if (!category) {
                        reject(new Error("Category is missing. Please select a category."));
                        return;
                    }
                    formData.append('category', category);
                    formData.append('fileCreatedAt', fileCreatedAt);

                    // Append file LAST
                    formData.append('file', file);

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
            setCompress('none');
            const today = new Date().toISOString().split('T')[0];
            setFileCreatedAt(today);

            showSuccessMessage();
            await fetchFiles();
            setIsUploadModalOpen(false);
        } catch (err) {
            if (err.message === 'Upload was cancelled.') {
                setError('Upload was cancelled.');
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

    // Cancel upload
    const handleCancelUpload = () => {
        if (uploadAbortControllerRef.current) {
            uploadAbortControllerRef.current.abort();
        }
    };

    // Remove file from upload list
    const removeFile = (index) => {
        setFilesToUpload(prev => prev.filter((_, i) => i !== index));
        if (validationErrors.file) {
            setValidationErrors({ ...validationErrors, file: '' });
        }
    };

    if (!token) {
        return (
            <div style={{ background: '#f4f7fb', minHeight: '100vh', padding: '48px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ maxWidth: 420, background: '#fff', padding: '28px 24px', borderRadius: 14, boxShadow: '0 6px 28px rgba(16,24,40,0.08)' }}>
                    <h1 style={{ fontWeight: 800, fontSize: 30, margin: 0, color: '#1f2a37' }}>ClearBoard</h1>
                    <div style={{ fontSize: 15, color: '#64748b', marginBottom: 8 }}>Secure File Portal</div>
                    <div style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>Please choose your department to continue</div>
                    <a href="/department" style={{ textDecoration: 'none' }}>
                        <button style={{ width: '100%', padding: 12, borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer', marginTop: 16 }}>
                            Continue to Department Selection
                        </button>
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="file-list-container">
            {/* Professional Loading Overlay */}
            {loading && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    animation: 'fadeIn 0.3s ease-in-out'
                }}>
                    <div style={{
                        textAlign: 'center',
                        animation: 'slideUp 0.5s ease-out'
                    }}>
                        {/* Circular Loader */}
                        <div style={{
                            position: 'relative',
                            width: '120px',
                            height: '120px',
                            margin: '0 auto 24px'
                        }}>
                            {/* Outer Ring */}
                            <svg style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                transform: 'rotate(-90deg)'
                            }}>
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="#e5e7eb"
                                    strokeWidth="6"
                                />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="54"
                                    fill="none"
                                    stroke="url(#gradient)"
                                    strokeWidth="6"
                                    strokeLinecap="round"
                                    strokeDasharray="339.292"
                                    strokeDashoffset="0"
                                    style={{
                                        animation: 'progress 2s ease-in-out infinite'
                                    }}
                                />
                                <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                        <stop offset="0%" stopColor="#3b82f6" />
                                        <stop offset="100%" stopColor="#8b5cf6" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            {/* Inner Icon */}
                            <div style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                fontSize: '36px',
                                animation: 'pulse 2s ease-in-out infinite'
                            }}>
                                📁
                            </div>
                        </div>

                        {/* Loading Text */}
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#1f2937',
                            margin: '0 0 8px 0',
                            animation: 'fadeIn 0.5s ease-in-out 0.2s both'
                        }}>
                            Loading Your Files
                        </h3>
                        <p style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            margin: 0,
                            animation: 'fadeIn 0.5s ease-in-out 0.4s both'
                        }}>
                            Please wait while we fetch your documents...
                        </p>

                        {/* Animated Dots */}
                        <div style={{
                            marginTop: '16px',
                            display: 'flex',
                            gap: '8px',
                            justifyContent: 'center'
                        }}>
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                        animation: `bounce 1.4s ease-in-out ${i * 0.2}s infinite`
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* CSS Animations */}
                    <style>{`
                        @keyframes fadeIn {
                            from {
                                opacity: 0;
                            }
                            to {
                                opacity: 1;
                            }
                        }

                        @keyframes slideUp {
                            from {
                                opacity: 0;
                                transform: translateY(20px);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0);
                            }
                        }

                        @keyframes progress {
                            0% {
                                stroke-dashoffset: 339.292;
                            }
                            50% {
                                stroke-dashoffset: 84.823;
                            }
                            100% {
                                stroke-dashoffset: 339.292;
                            }
                        }

                        @keyframes pulse {
                            0%, 100% {
                                transform: translate(-50%, -50%) scale(1);
                                opacity: 1;
                            }
                            50% {
                                transform: translate(-50%, -50%) scale(1.1);
                                opacity: 0.8;
                            }
                        }

                        @keyframes bounce {
                            0%, 80%, 100% {
                                transform: translateY(0);
                            }
                            40% {
                                transform: translateY(-12px);
                            }
                        }
                    `}</style>
                </div>
            )}

            {/* Left Sidebar - Filters */}
            <aside className="filters-sidebar">
                <div className="filters-header">
                    <h2 className="filters-title">Filter by</h2>
                    <button className="clear-filters-btn" onClick={clearFilters}>
                        Clear all
                    </button>
                </div>

                {/* Category Filter */}
                <div className="filter-section">
                    <label className="filter-section-title">Category</label>
                    {uniqueCategories.map(cat => {
                        const count = files.filter(f => f.category === cat).length;
                        return (
                            <div key={cat} className="filter-option">
                                <input
                                    type="radio"
                                    name="category"
                                    id={`cat-${cat}`}
                                    checked={filterCategory === cat}
                                    onChange={() => setFilterCategory(cat)}
                                />
                                <label htmlFor={`cat-${cat}`} className="filter-option-label">{cat}</label>
                                <span className="filter-option-count">{count}</span>
                            </div>
                        );
                    })}
                </div>

                {/* File Type Filter */}
                <div className="filter-section">
                    <label className="filter-section-title">Type</label>
                    {uniqueFileTypes.slice(0, 10).map(type => {
                        const count = files.filter(f =>
                            f.versions?.some(v => v.fileType === type)
                        ).length;
                        return (
                            <div key={type} className="filter-option">
                                <input
                                    type="radio"
                                    name="fileType"
                                    id={`type-${type}`}
                                    checked={filterFileType === type}
                                    onChange={() => setFilterFileType(type)}
                                />
                                <label htmlFor={`type-${type}`} className="filter-option-label">{type.toUpperCase()}</label>
                                <span className="filter-option-count">{count}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Date Filters */}
                <div className="filter-section">
                    <label className="filter-section-title">Date From</label>
                    <input
                        type="date"
                        className="date-filter-input"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                    />
                </div>

                <div className="filter-section">
                    <label className="filter-section-title">Date To</label>
                    <input
                        type="date"
                        className="date-filter-input"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                    />
                </div>
            </aside>

            {/* Right Content Area */}
            <main className="files-content">
                {/* Stats */}
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Total Files</div>
                        <div className="stat-value">{stats.totalFiles}</div>
                        <div className="stat-description">
                            {userRole === 'admin' ? 'All files in system' : 'Your uploaded files'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Storage Used</div>
                        <div className="stat-value">{stats.storageUsedMB.toFixed(2)} MB</div>
                        <div className="stat-description">
                            {stats.totalFiles > 0
                                ? `${(stats.storageUsedMB / stats.totalFiles).toFixed(2)} MB avg per file`
                                : 'No files yet'}
                        </div>
                    </div>
                </div>

                {/* Header with Search and Upload */}
                <div className="files-header">
                    <div className="files-header-top">
                        <div className="files-title-section">
                            <h1>All Files</h1>
                            <p className="files-count">Showing {filteredFiles.length} of {files.length} files</p>
                        </div>
                        <button className="upload-btn" onClick={() => setIsUploadModalOpen(true)}>

                            <span>Upload a File</span>
                        </button>
                    </div>
                    <div className="search-bar">
                        <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Search filtered files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Files Grid */}
                <div className="files-grid-container">
                    {loading ? (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                        </div>
                    ) : filteredFiles.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">
                                {filterCategory || filterFileType || filterDateFrom || filterDateTo || searchQuery ? '🔍' : '📂'}
                            </div>
                            <div className="empty-state-title">
                                {filterCategory || filterFileType || filterDateFrom || filterDateTo || searchQuery
                                    ? 'No files match the selected filters'
                                    : 'No files yet'}
                            </div>
                            <div className="empty-state-description">
                                {filterCategory || filterFileType || filterDateFrom || filterDateTo || searchQuery
                                    ? 'Try adjusting your filters or search query'
                                    : 'Upload your first file to get started'}
                            </div>
                        </div>
                    ) : (
                        <div className="files-grid">
                            {filteredFiles.map((fileGroup) => {
                                const latestVersion = fileGroup.versions?.[0] || {};
                                const fileType = latestVersion.fileType || 'unknown';

                                return (
                                    <div key={fileGroup.id} className="file-card">
                                        <div
                                            className="file-thumbnail"
                                            style={{
                                                background: getThumbnailGradient(fileType),
                                                cursor: 'pointer',
                                                border: '2px solid #e5e7eb',
                                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s ease'
                                            }}
                                            onClick={() => handlePreview(latestVersion.id, fileGroup.name, fileType)}
                                            title="Click to preview"
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#3b82f6';
                                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e5e7eb';
                                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                                            }}
                                        >
                                            <div className="file-type-icon" style={{ fontSize: '48px', marginBottom: '8px' }}>{getFileTypeIcon(fileType)}</div>
                                            <div className="file-badge" style={{
                                                background: '#f3f4f6',
                                                color: '#374151',
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                letterSpacing: '0.5px'
                                            }}>{fileType.toUpperCase()}</div>
                                        </div>

                                        <div className="file-info">
                                            <h3
                                                className="file-name"
                                                title={fileGroup.name}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handlePreview(latestVersion.id, fileGroup.name, fileType)}
                                            >
                                                {fileGroup.name}
                                            </h3>

                                            <div className="file-meta">
                                                <span>{latestVersion.size} KB</span>
                                                <span>v{latestVersion.version || 1}</span>
                                            </div>

                                            <div className="file-category">{fileGroup.category}</div>

                                            {(fileGroup.isShared || !fileGroup.isOwner) && (
                                                <div className="status-badges">
                                                    {fileGroup.isShared && (
                                                        <span className="status-badge shared">Shared</span>
                                                    )}
                                                    {!fileGroup.isOwner && (
                                                        <span className="status-badge team">Team File</span>
                                                    )}
                                                </div>
                                            )}

                                            <div className="file-actions">
                                                <button
                                                    className="file-action-btn primary"
                                                    onClick={() => handlePreview(latestVersion.id, fileGroup.name, fileType)}
                                                >
                                                    👁️ Preview
                                                </button>
                                                <button
                                                    className="file-action-btn"
                                                    onClick={() => handleDownload(latestVersion.id, fileGroup.name, fileType)}
                                                >
                                                    ⬇️ Download
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Upload Modal */}
            {isUploadModalOpen && (
                <div className="modal-overlay" onClick={() => !isUploading && setIsUploadModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Upload Files</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setIsUploadModalOpen(false)}
                                disabled={isUploading}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <form onSubmit={handleUpload}>
                                {/* File Selection */}
                                <div className="form-group">
                                    <label className="form-label">Select Files</label>
                                    <input
                                        type="file"
                                        multiple
                                        onChange={(e) => {
                                            setFilesToUpload(Array.from(e.target.files));
                                            if (validationErrors.file) {
                                                setValidationErrors({ ...validationErrors, file: '' });
                                            }
                                        }}
                                        disabled={isUploading}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            border: '2px dashed #e2e8f0',
                                            borderRadius: '8px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    {filesToUpload.length > 0 && (
                                        <ul style={{ marginTop: '8px', listStyle: 'none', padding: 0 }}>
                                            {filesToUpload.map((file, idx) => (
                                                <li key={idx} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    padding: '8px',
                                                    background: '#f8fafc',
                                                    borderRadius: '6px',
                                                    marginBottom: '4px'
                                                }}>
                                                    <span style={{ fontSize: '14px' }}>{file.name}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeFile(idx)}
                                                        disabled={isUploading}
                                                        style={{
                                                            background: '#ef4444',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            padding: '4px 8px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px'
                                                        }}
                                                    >
                                                        ×
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {validationErrors.file && (
                                        <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                                            {validationErrors.file}
                                        </div>
                                    )}
                                </div>

                                {/* Category */}
                                <div className="form-group">
                                    <label className="form-label">Category</label>
                                    <select
                                        value={category}
                                        onChange={(e) => {
                                            setCategory(e.target.value);
                                            if (validationErrors.category) {
                                                setValidationErrors({ ...validationErrors, category: '' });
                                            }
                                        }}
                                        disabled={isUploading}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '15px'
                                        }}
                                    >
                                        <option value="" disabled>Select Category</option>
                                        {allCategories.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    {validationErrors.category && (
                                        <div style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px' }}>
                                            {validationErrors.category}
                                        </div>
                                    )}
                                </div>

                                {/* Compression */}
                                <div className="form-group">
                                    <label className="form-label">Compression</label>
                                    <select
                                        value={compress}
                                        onChange={(e) => setCompress(e.target.value)}
                                        disabled={isUploading}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '15px'
                                        }}
                                    >
                                        <option value="none">None</option>
                                        <option value="zip">ZIP</option>
                                        <option value="brotli">Brotli</option>
                                    </select>
                                </div>

                                {/* File Created Date */}
                                <div className="form-group">
                                    <label className="form-label">File Created Date</label>
                                    <input
                                        type="date"
                                        value={fileCreatedAt}
                                        onChange={(e) => setFileCreatedAt(e.target.value)}
                                        disabled={isUploading}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            fontSize: '15px'
                                        }}
                                    />
                                </div>

                                {/* Upload Progress */}
                                {isUploading && (
                                    <div className="form-group">
                                        <div style={{
                                            width: '100%',
                                            height: '8px',
                                            background: '#e2e8f0',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${uploadProgress}%`,
                                                height: '100%',
                                                background: '#3b82f6',
                                                transition: 'width 0.3s ease'
                                            }}></div>
                                        </div>
                                        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '14px', color: '#64748b' }}>
                                            {uploadProgress}% uploaded
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                    {!isUploading ? (
                                        <>
                                            <button
                                                type="submit"
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: '#3b82f6',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Upload Files
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsUploadModalOpen(false)}
                                                style={{
                                                    flex: 1,
                                                    padding: '12px',
                                                    background: '#e2e8f0',
                                                    color: '#334155',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleCancelUpload}
                                            style={{
                                                flex: 1,
                                                padding: '12px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '16px',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Cancel Upload
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Notification */}
            {showSuccessNotification && (
                <div style={{
                    position: 'fixed',
                    bottom: 20,
                    right: 20,
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
                    gap: 8
                }}>
                    <span>✓</span>
                    <span>Files uploaded successfully!</span>
                </div>
            )}

            {/* Error Notification */}
            {error && (
                <div style={{
                    position: 'fixed',
                    bottom: 20,
                    left: 20,
                    background: '#dc2626',
                    color: 'white',
                    padding: '12px 20px',
                    borderRadius: 8,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    fontSize: 14,
                    fontWeight: 600,
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                }}>
                    <span>⚠</span>
                    <span>{error}</span>
                </div>
            )}
        </div>
    );
}

export default FacetedFileList;
