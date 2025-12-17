import React, { useState, useEffect, useRef, useCallback } from 'react';
import { API_ENDPOINTS } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom'; // ✅ UPDATED: include useLocation
import { useIdleTimer } from '../hooks/useIdleTimer'; // Import the new hook
import Fuse from 'fuse.js';
import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist'; // ✅ NEW: PDF.js for first page preview
import '../styles/Dashboard.css'; // Import the new CSS file
import '../styles/Modal.css'; // The new modal styles
import '../styles/Calendar.css'; // Professional calendar picker styling
import AdminUserFilter from './AdminUserFilter';
import SemanticSearchBar from './SemanticSearchBar'; // ✅ NEW: Semantic search component
import ModernDatePicker from './ModernDatePicker'; // ✅ NEW: Modern calendar picker

// ✅ Configure PDF.js worker - using local worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const extractTextFromDocxXmlFirstPage = (xmlDoc) => {
  const body = xmlDoc.getElementsByTagName('w:body')?.[0];
  if (!body) return '';

  const paragraphs = Array.from(body.getElementsByTagName('w:p'));
  const lines = [];

  for (const p of paragraphs) {
    const texts = Array.from(p.getElementsByTagName('w:t')).map(t => t.textContent || '');
    const line = texts.join('');
    if (line.trim().length > 0) lines.push(line);

    const hasPageBreak =
      Array.from(p.getElementsByTagName('w:br')).some(br => {
        const t = br.getAttribute('w:type') || br.getAttribute('type');
        return (t || '').toLowerCase() === 'page';
      }) ||
      p.getElementsByTagName('w:lastRenderedPageBreak').length > 0;

    if (hasPageBreak) break;
  }

  return lines.join('\n').trim();
};

const extractTextFromPptxSlideXml = (xmlDoc) => {
  const paragraphs = Array.from(xmlDoc.getElementsByTagName('a:p'));
  const lines = [];

  for (const p of paragraphs) {
    const runs = Array.from(p.getElementsByTagName('a:t')).map(t => t.textContent || '');
    const line = runs.join('');
    if (line.trim().length > 0) lines.push(line);
  }

  return lines.join('\n').trim();
};

// ✅ DOCX First Page Preview Component (text-only, first page)
const DOCXFirstPagePreview = ({ url, name }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setContent('');

        const buf = await fetch(url).then(r => r.arrayBuffer());
        if (cancelled) return;

        const zip = await JSZip.loadAsync(buf);

        // DOCX usually stores main body here
        const docXmlFile = zip.file('word/document.xml');
        if (!docXmlFile) {
          throw new Error('Invalid DOCX (missing word/document.xml)');
        }

        const xmlText = await docXmlFile.async('text');
        if (cancelled) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        // If parsing failed, DOMParser returns a document with <parsererror>
        if (xmlDoc.getElementsByTagName('parsererror')?.length) {
          throw new Error('Failed to parse DOCX XML');
        }

        const firstPageText = extractTextFromDocxXmlFirstPage(xmlDoc);
        setContent(firstPageText || 'No text found on the first page.');
        setLoading(false);
      } catch (err) {
        console.error('Error rendering DOCX preview:', err);
        setError('Failed to load DOC/DOCX preview');
        setLoading(false);
      }
    };

    if (url) load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #333',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading first page...</p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', color: '#ef4444' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div style={{
          width: 'min(820px, 100%)',
          background: '#fff',
          color: '#111827',
          borderRadius: '10px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          padding: '48px 56px',
          boxSizing: 'border-box',
          lineHeight: 1.6,
          fontSize: 15,
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          // Approx A4 page height; we intentionally hide overflow to show only the first page
          maxHeight: '1120px'
        }}>
          {content}
        </div>
      )}
    </div>
  );
};

// ✅ PPTX First Slide Preview Component (text-only, first slide)
const PPTXFirstSlidePreview = ({ url, name }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        setContent('');

        const buf = await fetch(url).then(r => r.arrayBuffer());
        if (cancelled) return;

        const zip = await JSZip.loadAsync(buf);

        const slideKeys = Object.keys(zip.files)
          .filter(k => /^ppt\/slides\/slide\d+\.xml$/i.test(k))
          .sort((a, b) => {
            const na = Number(a.match(/slide(\d+)\.xml/i)?.[1] || 0);
            const nb = Number(b.match(/slide(\d+)\.xml/i)?.[1] || 0);
            return na - nb;
          });

        const firstSlideKey = slideKeys[0] || 'ppt/slides/slide1.xml';
        const slideXmlFile = zip.file(firstSlideKey);

        if (!slideXmlFile) {
          throw new Error('Invalid PPTX (missing first slide XML)');
        }

        const xmlText = await slideXmlFile.async('text');
        if (cancelled) return;

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        if (xmlDoc.getElementsByTagName('parsererror')?.length) {
          throw new Error('Failed to parse PPTX XML');
        }

        const firstSlideText = extractTextFromPptxSlideXml(xmlDoc);
        setContent(firstSlideText || 'No text found on the first slide.');
        setLoading(false);
      } catch (err) {
        console.error('Error rendering PPTX preview:', err);
        setError('Failed to load PPT/PPTX preview');
        setLoading(false);
      }
    };

    if (url) load();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #333',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <p>Loading first slide...</p>
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', color: '#ef4444' }}>
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && (
        <div style={{
          width: 'min(960px, 100%)',
          aspectRatio: '16 / 9',
          background: '#ffffff',
          color: '#111827',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
          padding: '44px 52px',
          boxSizing: 'border-box',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-start'
        }}>
          <div style={{
            whiteSpace: 'pre-wrap',
            lineHeight: 1.6,
            fontSize: 16,
            width: '100%'
          }}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ PDF First Page Preview Component
const PDFFirstPagePreview = ({ url, name }) => {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [canvasKey, setCanvasKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const renderPDF = async () => {
      try {
        setLoading(true);
        setError(null);

        // Force new canvas by updating key
        setCanvasKey(prev => prev + 1);

        // Small delay to ensure canvas is recreated
        await new Promise(resolve => setTimeout(resolve, 100));

        if (cancelled) return;

        // Load the PDF document
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        // Get only the first page
        const page = await pdf.getPage(1);

        if (cancelled) return;

        // Prepare canvas
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');

        // Calculate scale to make PDF readable
        const container = canvas.parentElement;
        const containerWidth = container?.clientWidth || 900;

        const viewport = page.getViewport({ scale: 1 });

        // Scale based on width, ensuring minimum readable size
        const widthScale = (containerWidth * 0.9) / viewport.width;
        const scale = Math.max(Math.min(widthScale, 2.0), 1.0); // Between 1.0 and 2.0

        const scaledViewport = page.getViewport({ scale });

        // Set canvas dimensions
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        // Render the page
        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport
        };

        await page.render(renderContext).promise;

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error rendering PDF:', err);
          setError('Failed to load PDF preview');
          setLoading(false);
        }
      }
    };

    if (url) {
      renderPDF();
    }

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      background: '#2a2a2a',
      padding: '20px',
      overflow: 'auto'
    }}>
      {loading && (
        <div style={{
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #333',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading first page...</p>
        </div>
      )}
      {error && (
        <div style={{
          textAlign: 'center',
          color: '#ef4444'
        }}>
          <p>{error}</p>
        </div>
      )}
      <canvas
        key={canvasKey}
        ref={canvasRef}
        style={{
          maxWidth: '100%',
          height: 'auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          borderRadius: '8px',
          display: loading || error ? 'none' : 'block'
        }}
      />

    </div>
  );
};

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
const pageStyle = { background: '#f4f7fb', minHeight: '100vh', padding: '20px 16px' };
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
const thStyle = { background: '#fff', color: '#222', fontWeight: 600, padding: '8px 10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', fontSize: 12, letterSpacing: 0.1, verticalAlign: 'middle', height: 32, boxSizing: 'border-box' };
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #f3f4f6', borderRight: '1px solid #f3f4f6', verticalAlign: 'middle', textAlign: 'center', fontSize: 12, color: '#222', background: '#fff', height: 32, boxSizing: 'border-box' };
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
  const [showDownloadLinkModal, setShowDownloadLinkModal] = useState(false);
  const [downloadLinkMessage, setDownloadLinkMessage] = useState('');

  // ✅ NEW: Sorting and File Type Filtering
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'oldest', 'name-asc', 'name-desc', 'size-asc', 'size-desc'
  const [fileTypeFilter, setFileTypeFilter] = useState('all'); // 'all', 'pdf', 'ppt', 'doc', 'excel', 'image', 'video', 'other'
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
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.file;
      return newErrors;
    });
  };

  const handleFileSelect = (e) => {
    if (readOnlyMode) return;
    const list = Array.from(e.target.files || []);
    if (list.length === 0) return;

    // Create new file objects with empty defaults to force user selection
    const newFiles = list.map(file => ({
      file,
      category: '',
      compress: '',
      fileCreatedAt: ''
    }));

    setFilesToUpload(prev => [...prev, ...newFiles]);

    // Clear validation error for file selection
    if (validationErrors.file) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.file;
        return newErrors;
      });
    }

    // Reset the file input value so the same file can be selected again if needed
    e.target.value = '';
  };

  const updateFileRow = (index, field, value) => {
    setFilesToUpload(prev => prev.map((item, i) => {
      if (i === index) {
        return { ...item, [field]: value };
      }
      return item;
    }));

    // Clear specific validation error if fixed
    if (field === 'category' && value) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        // We might need a more complex error structure for per-row errors, 
        // but for now clearing the global category error (if we repurpose it) works as a start.
        // Better: we'll handle validation dynamically in the render or specifically.
        return newErrors;
      });
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
      setError('Please select at least one file');
      setTimeout(() => setError(''), 3000);
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

      // Show professional modal instead of alert
      setDownloadLinkMessage(data.message || 'Download link sent successfully!');
      setShowDownloadLinkModal(true);
      setSelectedFiles(new Set()); // Clear selection
      setOpenActionMenuId(null); // Close menu
    } catch (err) {
      setError(err.message || 'Failed to send download link');
      setTimeout(() => setError(''), 3000);
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

    // ✅ NEW: File Type Filtering
    if (fileTypeFilter !== 'all') {
      filteredFiles = filteredFiles.filter(f => {
        // Check file type from the first version (most recent)
        const firstVersion = f.versions?.[0] || {};
        const fileType = (firstVersion.fileType || firstVersion.mimetype || f.fileType || f.mimetype || '').toLowerCase();
        const fileName = (f.name || '').toLowerCase();

        // The fileType property contains the extension directly (e.g., "pptx", "pdf", "png")
        // Filename does NOT include the extension
        const extension = fileType;

        switch (fileTypeFilter) {
          case 'pdf':
            return extension === 'pdf';
          case 'ppt':
            return extension === 'ppt' || extension === 'pptx';
          case 'doc':
            return extension === 'doc' || extension === 'docx';
          case 'excel':
            return extension === 'xls' || extension === 'xlsx' || extension === 'csv';
          case 'image':
            return ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension);
          case 'video':
            return ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(extension);
          case 'other':
            // Files that don't match common types
            const commonExtensions = ['pdf', 'ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx', 'csv',
              'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico',
              'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'];
            return !commonExtensions.includes(extension);
          default:
            return true;
        }
      });
    }

    // Step 2: Apply search query filter
    if (searchQuery.trim()) {
      // Apply fuzzy search on the pre-filtered results
      const fuse = new Fuse(filteredFiles, {
        keys: ['name'],       // The property you want to search
        threshold: 0.4,       // Adjusts the "fuzziness" (0.0 = exact match, 1.0 = match anything)
        includeScore: true,
      });

      const results = fuse.search(searchQuery);
      filteredFiles = results.map(result => result.item);
    }

    // ✅ NEW: Sorting Logic
    const sortedFiles = [...filteredFiles].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          // Most recent first (default) - use the first version's uploadedAt or file group's uploadedAt
          const dateA = new Date(a.versions?.[0]?.uploadedAt || a.uploadedAt || 0);
          const dateB = new Date(b.versions?.[0]?.uploadedAt || b.uploadedAt || 0);
          return dateB - dateA;
        case 'oldest':
          // Oldest first
          const dateA2 = new Date(a.versions?.[0]?.uploadedAt || a.uploadedAt || 0);
          const dateB2 = new Date(b.versions?.[0]?.uploadedAt || b.uploadedAt || 0);
          return dateA2 - dateB2;
        case 'name-asc':
          // A to Z
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          // Z to A
          return (b.name || '').localeCompare(a.name || '');
        case 'size-asc':
          // Smallest first
          const sizeA = a.versions?.[0]?.size || 0;
          const sizeB = b.versions?.[0]?.size || 0;
          return sizeA - sizeB;
        case 'size-desc':
          // Largest first
          const sizeA2 = a.versions?.[0]?.size || 0;
          const sizeB2 = b.versions?.[0]?.size || 0;
          return sizeB2 - sizeA2;
        default:
          // Default to recent
          const dateA3 = new Date(a.versions?.[0]?.uploadedAt || a.uploadedAt || 0);
          const dateB3 = new Date(b.versions?.[0]?.uploadedAt || b.uploadedAt || 0);
          return dateB3 - dateA3;
      }
    });

    return sortedFiles;

  }, [files, filterCategory, filterDateFrom, filterDateTo, searchQuery, adminOwnerFilter, adminFilterMode, adminProjectFilter, userRole, isSemanticSearchActive, semanticSearchResults, fileTypeFilter, sortBy]);
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
    } else {
      // Validate each file
      for (let i = 0; i < filesToUpload.length; i++) {
        const f = filesToUpload[i];
        if (!f.category) {
          errors.category = `Category missing for "${f.file.name}"`;
          break; // Stop at first error to avoid huge list
        }
        if (!f.compress) {
          errors.compress = `Compression missing for "${f.file.name}"`;
          break;
        }
        if (!f.fileCreatedAt) {
          errors.fileCreatedAt = `Date missing for "${f.file.name}"`;
          break;
        }
      }
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
      const totalSize = filesToUpload.reduce((sum, item) => sum + item.file.size, 0);

      progressIntervalRef.current = setInterval(() => {
        const totalLoaded = loadedArray.reduce((sum, l) => sum + l, 0);
        const totalProgress = totalSize > 0 ? Math.min((totalLoaded / totalSize) * 100, 99) : 0;
        setUploadProgress(Math.round(totalProgress));
      }, 100);

      const uploadSingle = (fileItem, index) => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();

          formData.append('compress', fileItem.compress || 'none');

          if (!fileItem.category) {
            reject(new Error(`Category is missing for ${fileItem.file.name}.`));
            return;
          }
          formData.append('category', fileItem.category);

          if (!fileItem.compress) {
            reject(new Error(`Compression is missing for ${fileItem.file.name}.`));
            return;
          }

          if (!fileItem.fileCreatedAt) {
            reject(new Error(`Creation date is missing for ${fileItem.file.name}.`));
            return;
          }
          formData.append('fileCreatedAt', fileItem.fileCreatedAt);

          // Append file LAST so that busboy reads metadata fields first
          formData.append('file', fileItem.file);

          xhr.open('POST', API_ENDPOINTS.UPLOAD, true);
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);

          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              loadedArray[index] = event.loaded;
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              loadedArray[index] = fileItem.file.size;
              resolve();
            } else {
              reject(new Error(`Upload failed for ${fileItem.file.name}`));
            }
          });

          xhr.addEventListener('error', () => {
            reject(new Error(`Upload failed for ${fileItem.file.name}`));
          });

          xhr.addEventListener('abort', () => {
            reject(new Error('Upload was cancelled.'));
          });

          if (uploadAbortControllerRef.current) {
            uploadAbortControllerRef.current.signal.addEventListener('abort', () => {
              xhr.abort();
            });
          }

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
      // Reset global defaults if needed, though they aren't used for upload anymore
      setCategory('');
      setCompress('none');
      const today = new Date().toISOString().split('T')[0];
      setFileCreatedAt(today);

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
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Preview failed:', res.status, errorText);
        throw new Error(`Preview failed: ${res.status}`);
      }
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
      console.error('Preview error:', err);
      setError(err.message || 'Preview failed');
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
              Upload Files
              {userRole === 'admin' && <span style={adminBadge}>ADMIN</span>}
              {readOnlyMode && <span style={{ ...adminBadge, background: '#64748b', marginLeft: 8 }}>READ-ONLY</span>}
            </h2>
            {readOnlyMode && (
              <div style={{ color: '#64748b', fontSize: 13, marginTop: 8, marginBottom: 8 }}>
                Uploading is disabled in read-only mode.
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              {/* Top Action Bar */}
              {/* Top Action Bar or Hero Dropzone */}
              {filesToUpload.length === 0 ? (
                /* HERO EMPTY STATE */
                <div
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '16px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f8fafc',
                    transition: 'all 0.2s ease',
                    cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!readOnlyMode) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!readOnlyMode) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                >
                  <label htmlFor="hero-upload" style={{ cursor: readOnlyMode ? 'not-allowed' : 'pointer', display: 'block', width: '100%', height: '100%' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      background: '#e0e7ff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 16px',
                      color: '#4f46e5'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', margin: '0 0 8px' }}>
                      Upload your documents
                    </h3>
                    <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px' }}>
                      Click to browse files (PDF, DOCX, PPTX, Images, etc.)
                    </p>
                    <span style={{
                      padding: '10px 24px',
                      background: '#3b82f6',
                      color: '#fff',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '14px',
                      display: 'inline-block',
                      boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)'
                    }}>
                      Browse Files
                    </span>
                    <input
                      id="hero-upload"
                      type="file"
                      multiple
                      disabled={readOnlyMode}
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>
              ) : (
                /* COMPACT BAR FOR ACTIVE UPLOAD */
                <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center', animation: 'fadeIn 0.3s ease' }}>
                  <label
                    style={{
                      ...smallBtn,
                      background: '#3b82f6',
                      cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      fontSize: '14px'
                    }}
                  >
                    <span style={{ fontSize: 18 }}>+</span> Add More Files
                    <input
                      type="file"
                      multiple
                      disabled={readOnlyMode}
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {filesToUpload.length > 0 && (
                    <div style={{ fontSize: 14, color: '#64748b' }}>
                      {filesToUpload.length} file{filesToUpload.length !== 1 ? 's' : ''} selected
                    </div>
                  )}

                  {filesToUpload.length > 0 && (
                    <button
                      onClick={() => setFilesToUpload([])}
                      style={{ ...toggleBtn, color: '#ef4444', textDecoration: 'none', marginLeft: 'auto', fontSize: 14, fontWeight: 600 }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}

              {/* File List Table */}
              {filesToUpload.length > 0 && (
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                  overflow: 'visible',
                  marginBottom: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: '50px' }}>S.No</th>
                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>File Name</th>
                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: '220px' }}>Category *</th>
                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: '180px' }}>Compression *</th>
                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: '200px' }}>Creation Date *</th>
                        <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', width: '40px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filesToUpload.map((item, idx) => (
                        <tr key={idx} style={{
                          borderBottom: idx === filesToUpload.length - 1 ? 'none' : '1px solid #f3f4f6',
                          background: '#fff'
                        }}>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', fontWeight: 600, color: '#64748b', fontSize: 13 }}>
                            {idx + 1}.
                          </td>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 500, color: '#1f2937', fontSize: 14 }}>{item.file.name}</div>
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>{(item.file.size / 1024).toFixed(1)} KB</div>
                            {validationErrors.file && filesToUpload.length === 1 && (
                              <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>{validationErrors.file}</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <select
                              value={item.category}
                              onChange={(e) => updateFileRow(idx, 'category', e.target.value)}
                              style={{ ...select, width: '100%', padding: '8px 12px', border: (!item.category && validationErrors.category) ? '1px solid #dc2626' : select.border }}
                              disabled={readOnlyMode}
                            >
                              <option value="" disabled>Select Category</option>
                              {allCategories.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                            </select>
                            {validationErrors.category && !item.category && (
                              <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>Required</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <select
                              value={item.compress}
                              onChange={(e) => updateFileRow(idx, 'compress', e.target.value)}
                              style={{ ...select, width: '100%', padding: '8px 12px', border: (!item.compress && validationErrors.compress) ? '1px solid #dc2626' : select.border }}
                              disabled={readOnlyMode}
                            >
                              <option value="" disabled>Select Type</option>
                              <option value="zip">Zip</option>
                              <option value="brotli">Brotli</option>
                            </select>
                            {validationErrors.compress && !item.compress && (
                              <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4 }}>Required</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <div style={{ border: (!item.fileCreatedAt && validationErrors.fileCreatedAt) ? '1px solid #dc2626' : 'none', borderRadius: 8 }}>
                              <ModernDatePicker
                                selected={item.fileCreatedAt ? new Date(item.fileCreatedAt) : null}
                                onChange={(date) => {
                                  if (!date) {
                                    updateFileRow(idx, 'fileCreatedAt', '');
                                    return;
                                  }
                                  // Fix: Use local time to avoid timezone offset issues (off by one day)
                                  const year = date.getFullYear();
                                  const month = String(date.getMonth() + 1).padStart(2, '0');
                                  const day = String(date.getDate()).padStart(2, '0');
                                  const localDateString = `${year}-${month}-${day}`;

                                  updateFileRow(idx, 'fileCreatedAt', localDateString);
                                }}
                                placeholderText="Select Date"
                                disabled={readOnlyMode}
                              />
                            </div>
                            {validationErrors.fileCreatedAt && !item.fileCreatedAt && (
                              <div style={{ color: '#dc2626', fontSize: 11, marginTop: 4, paddingLeft: 4 }}>Required</div>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <button
                              onClick={() => removeFile(idx)}
                              disabled={readOnlyMode}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#9ca3af',
                                cursor: readOnlyMode ? 'not-allowed' : 'pointer',
                                fontSize: 18,
                                padding: 4,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              className="hover-red"
                              title="Remove file"
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Main Upload Button */}
              {filesToUpload.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
                  {Object.keys(validationErrors).length > 0 && (
                    <div style={{ color: '#dc2626', fontSize: 14, fontWeight: 500 }}>
                      Please fix errors before uploading
                    </div>
                  )}
                  <button
                    onClick={handleUpload}
                    disabled={readOnlyMode || isUploading || stats.storageUsedMB >= STORAGE_QUOTA_MB}
                    style={{
                      ...smallBtn,
                      width: 'auto',
                      minWidth: 160,
                      background: (isUploading || Object.keys(validationErrors).length > 0) ? '#9ca3af' : '#2563eb',
                      cursor: (isUploading || Object.keys(validationErrors).length > 0) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {isUploading ? 'Uploading...' : `Upload ${filesToUpload.length} File${filesToUpload.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && !readOnlyMode && (
                <div style={{ marginTop: 24, padding: 16, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: '#475569', fontWeight: 600, flexGrow: 1 }}>
                      Uploading {filesToUpload.length} file{filesToUpload.length !== 1 ? 's' : ''}...
                    </span>
                    <span style={{ fontSize: 13, color: '#2563eb', fontWeight: 700 }}>
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

          {/* ✨ MODERN 6-COLUMN FILTER GRID ✨ */}
          <div style={{ display: 'grid', marginBottom: 28, gridTemplateColumns: 'repeat(6, 1fr)', gap: 16, alignItems: 'end' }}>
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
              <ModernDatePicker
                selected={filterDateFrom ? new Date(filterDateFrom) : null}
                onChange={(date) => {
                  if (!date) {
                    setFilterDateFrom('');
                    return;
                  }
                  // Fix: Manual local date string construction (YYYY-MM-DD)
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFilterDateFrom(`${year}-${month}-${day}`);
                }}
                placeholderText="Select start date"
                isClearable
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>Date To</label>
              <ModernDatePicker
                selected={filterDateTo ? new Date(filterDateTo) : null}
                onChange={(date) => {
                  if (!date) {
                    setFilterDateTo('');
                    return;
                  }
                  // Fix: Manual local date string construction (YYYY-MM-DD)
                  const year = date.getFullYear();
                  const month = String(date.getMonth() + 1).padStart(2, '0');
                  const day = String(date.getDate()).padStart(2, '0');
                  setFilterDateTo(`${year}-${month}-${day}`);
                }}
                placeholderText="Select end date"
                isClearable
              />
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

            {/* ✅ NEW: Sort By Filter */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}> Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
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
                <option value="recent">Recent First</option>
                <option value="oldest">Oldest First</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="size-asc">Size (Small)</option>
                <option value="size-desc">Size (Large)</option>
              </select>
            </div>

            {/* ✅ NEW: File Type Filter */}
            <div>
              <label style={{ ...label, fontSize: 13, marginBottom: 8 }}>File Type</label>
              <select
                value={fileTypeFilter}
                onChange={e => setFileTypeFilter(e.target.value)}
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
                <option value="all">📂 All Files</option>
                <option value="pdf"> PDF Files</option>
                <option value="ppt">PowerPoint</option>
                <option value="doc">Word Docs</option>
                <option value="excel">Excel Files</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="other">Other Files</option>
              </select>
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
                          style={{
                            cursor: 'pointer',
                            color: '#1f2937',
                            fontWeight: 500,
                            transition: 'color 0.2s ease',
                          }}
                          onMouseEnter={(e) => e.target.style.color = '#4f46e5'}
                          onMouseLeave={(e) => e.target.style.color = '#1f2937'}
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
              alignItems: 'flex-start',
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
                  color: '#fff',
                  width: '100%',
                  height: '100%',
                  minHeight: '400px'
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

                  // PDF Preview - First Page Only
                  if (fileType === 'pdf') {
                    return (
                      <PDFFirstPagePreview url={previewFileData.url} name={previewFileData.name} />
                    );
                  }

                  // DOC/DOCX Preview - First Page Only (text-only)
                  if (fileType === 'doc' || fileType === 'docx') {
                    return (
                      <DOCXFirstPagePreview url={previewFileData.url} name={previewFileData.name} />
                    );
                  }

                  // PPT/PPTX Preview - First Slide Only (text-only)
                  if (fileType === 'ppt' || fileType === 'pptx') {
                    return (
                      <PPTXFirstSlidePreview url={previewFileData.url} name={previewFileData.name} />
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
                            width: '100%'
                          }}
                        >
                          Your browser does not support audio playback.
                        </audio>
                      </div>
                    );
                  }

                  // Unsupported file types
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
                        fontSize: '14px'
                      }}>
                        This file type cannot be previewed in the browser.
                      </p>
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


          </div>
        </div>
      )}

      {/* Download Link Confirmation Modal */}
      {showDownloadLinkModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowDownloadLinkModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              borderRadius: '20px',
              padding: '40px',
              maxWidth: '480px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'slideUp 0.3s ease-out',
              position: 'relative',
              border: '1px solid rgba(255, 255, 255, 0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 24px',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
              animation: 'scaleIn 0.4s ease-out 0.1s both'
            }}>
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            {/* Title */}
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '28px',
              fontWeight: '700',
              color: '#111827',
              textAlign: 'center',
              letterSpacing: '-0.02em'
            }}>
              Email Sent Successfully!
            </h2>

            {/* Message */}
            <p style={{
              margin: '0 0 32px 0',
              fontSize: '16px',
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: '1.6'
            }}>
              {downloadLinkMessage || 'You will receive an email with the download link shortly. Please check your inbox.'}
            </p>

            {/* Info Box */}
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #93c5fd',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                background: '#3b82f6',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#1e40af',
                  fontWeight: '500',
                  lineHeight: '1.5'
                }}>
                  <strong>Note:</strong> The download link will be valid for 24 hours. If you don't see the email, please check your spam folder.
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setShowDownloadLinkModal(false)}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
              }}
            >
              Got it!
            </button>
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
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default FileList;
