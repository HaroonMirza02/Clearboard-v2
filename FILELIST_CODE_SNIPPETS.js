// ============================================================================
// FILELIST.JSX - CODE SNIPPETS TO ADD
// ============================================================================

// 1. ADD THESE STATES (after line 231, after editFormData)
// ============================================================================
const [selectedFiles, setSelectedFiles] = useState(new Set());
const [downloadLinkSending, setDownloadLinkSending] = useState(false);


// 2. ADD THESE HELPER FUNCTIONS (after handleDeleteFile function, around line 1000)
// ============================================================================

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


// 3. ADD BULK DOWNLOAD BUTTON (before the table, around line 1880)
// ============================================================================
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


// 4. UPDATE TABLE HEADER (around line 1890)
// ============================================================================
// ADD THIS AS THE FIRST <th> in the header row:
<th style={thStyle}>
  <input
    type="checkbox"
    checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
    onChange={toggleSelectAll}
    style={{ cursor: 'pointer' }}
    title="Select all files"
  />
</th>


// 5. UPDATE TABLE ROW (around line 1932)
// ============================================================================
// ADD THIS AS THE FIRST <td> in each file row:
<td style={tdStyle}>
  <input
    type="checkbox"
    checked={selectedFiles.has(displayedVersion.id)}
    onChange={() => toggleFileSelection(displayedVersion.id)}
    style={{ cursor: 'pointer' }}
  />
</td>


// 6. REPLACE DOWNLOAD BUTTON IN ACTIONS MENU (line 1990)
// ============================================================================
// FIND THIS LINE:
// <button className="actions-item" onClick={() => handleDownload(displayedVersion.id, fileGroup.name, displayedVersion.fileType)}>⬇️ Download</button>

// REPLACE WITH:
<button 
  className="actions-item" 
  onClick={() => handleSendDownloadLink([displayedVersion.id])}
  disabled={downloadLinkSending}
>
  📧 {downloadLinkSending ? 'Sending...' : 'Send Download Link'}
</button>


// 7. UPDATE COLSPAN IN EMPTY STATE (line 1910)
// ============================================================================
// FIND:
// colSpan={userRole === 'admin' ? 11 : 10}

// REPLACE WITH (add 1 for the checkbox column):
// colSpan={userRole === 'admin' ? 12 : 11}
