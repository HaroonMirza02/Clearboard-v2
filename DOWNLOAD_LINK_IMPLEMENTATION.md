# Email Download Link Feature Implementation Guide

## Overview
This document outlines the changes needed to implement email-based download links and multi-file selection in ClearBoard.

## Backend Changes (✅ COMPLETED)

### 1. Email Template Added (server.js:212-256)
- `downloadLinkHtml()` function creates professional HTML emails
- Supports single and multiple file downloads
- Includes individual download buttons and "Download All" option

### 2. New API Endpoints Added (server.js:1140-1387)

#### `/api/files/send-download-link` (POST)
- Accepts array of file IDs
- Validates user access to each file
- Creates JWT tokens (24-hour expiry)
- Sends formatted email with download links
- Returns confirmation message

#### `/api/files/download-with-token/:token` (GET)
- Downloads single file using JWT token
- No authentication required (token contains auth)
- Handles compression/decompression

#### `/api/files/download-all-with-token/:token` (GET)
- Downloads multiple files as ZIP
- Uses archiver package
- Streams files directly to ZIP

### 3. API Endpoints Configuration (src/utils/api.js:43-48)
```javascript
SEND_DOWNLOAD_LINK: `${API_BASE_URL}/api/files/send-download-link`,
DOWNLOAD_WITH_TOKEN: (token) => `${API_BASE_URL}/api/files/download-with-token/${token}`,
DOWNLOAD_ALL_WITH_TOKEN: (token) => `${API_BASE_URL}/api/files/download-all-with-token/${token}`,
```

## Frontend Changes (NEEDED)

### 1. Add State Variables (FileList.jsx ~line 231)
```javascript
// Add after editFormData state
const [selectedFiles, setSelectedFiles] = useState(new Set());
const [downloadLinkSending, setDownloadLinkSending] = useState(false);
```

### 2. Add Helper Functions (FileList.jsx ~line 1000)
```javascript
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
```

### 3. Update Table Header (FileList.jsx ~line 1890)
```javascript
<thead>
  <tr>
    {/* Add checkbox column */}
    <th style={thStyle}>
      <input
        type="checkbox"
        checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
        onChange={toggleSelectAll}
        style={{ cursor: 'pointer' }}
      />
    </th>
    <th style={thStyle}>Name</th>
    {/* ... rest of headers ... */}
  </tr>
</thead>
```

### 4. Update Table Row (FileList.jsx ~line 1932)
```javascript
<tr key={fileGroup.id} style={zebra(idx)}>
  {/* Add checkbox cell */}
  <td style={tdStyle}>
    <input
      type="checkbox"
      checked={selectedFiles.has(displayedVersion.id)}
      onChange={() => toggleFileSelection(displayedVersion.id)}
      style={{ cursor: 'pointer' }}
    />
  </td>
  <td style={tdStyle}>
    {/* ... existing name cell ... */}
  </td>
  {/* ... rest of cells ... */}
</tr>
```

### 5. Replace Download Button in Actions Menu (FileList.jsx ~line 1990)
```javascript
{/* REPLACE THIS LINE: */}
<button className="actions-item" onClick={() => handleDownload(displayedVersion.id, fileGroup.name, displayedVersion.fileType)}>⬇️ Download</button>

{/* WITH THIS: */}
<button 
  className="actions-item" 
  onClick={() => handleSendDownloadLink([displayedVersion.id])}
  disabled={downloadLinkSending}
>
  📧 {downloadLinkSending ? 'Sending...' : 'Send Download Link'}
</button>
```

### 6. Add Bulk Download Button (FileList.jsx ~line 1880, before table)
```javascript
{/* Add this before the table */}
{selectedFiles.size > 0 && (
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
)}
```

### 7. Create Download Handler Pages (New Files Needed)

Create `src/pages/DownloadPage.jsx`:
```javascript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/api';

function DownloadPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('downloading');
  const [error, setError] = useState('');

  useEffect(() => {
    const download = async () => {
      try {
        const url = API_ENDPOINTS.DOWNLOAD_WITH_TOKEN(token);
        window.location.href = url;
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };
    download();
  }, [token]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      {status === 'downloading' && <p>Starting download...</p>}
      {status === 'success' && <p>Download started! Check your downloads folder.</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}

export default DownloadPage;
```

Create `src/pages/DownloadAllPage.jsx`:
```javascript
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/api';

function DownloadAllPage() {
  const { token } = useParams();
  const [status, setStatus] = useState('downloading');
  const [error, setError] = useState('');

  useEffect(() => {
    const download = async () => {
      try {
        const url = API_ENDPOINTS.DOWNLOAD_ALL_WITH_TOKEN(token);
        window.location.href = url;
        setStatus('success');
      } catch (err) {
        setStatus('error');
        setError(err.message);
      }
    };
    download();
  }, [token]);

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      {status === 'downloading' && <p>Preparing your files...</p>}
      {status === 'success' && <p>Download started! All files will be downloaded as a ZIP.</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}

export default DownloadAllPage;
```

### 8. Update Router (src/App.jsx or router file)
```javascript
import DownloadPage from './pages/DownloadPage';
import DownloadAllPage from './pages/DownloadAllPage';

// Add these routes:
<Route path="/download/:token" element={<DownloadPage />} />
<Route path="/download-all/:token" element={<DownloadAllPage />} />
```

## Testing Checklist

1. ✅ Backend email template renders correctly
2. ✅ JWT tokens are generated with 24-hour expiry
3. ⏳ Single file download link sent to email
4. ⏳ Multiple files download links sent to email
5. ⏳ Download link from email works
6. ⏳ Download all button in email works
7. ⏳ Expired tokens show proper error message
8. ⏳ Multi-select checkboxes work
9. ⏳ Select all/deselect all works
10. ⏳ Bulk download button appears when files selected

## Notes

- Download links expire after 24 hours for security
- Users must have email addresses in their profile
- The system uses the existing SMTP configuration
- In development mode (no SMTP), links are logged to console
- ZIP files are created on-the-fly for bulk downloads
