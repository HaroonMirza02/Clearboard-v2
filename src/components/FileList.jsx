import React, { useState, useEffect } from 'react';

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

function FileList() {
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [login, setLogin] = useState({ userId: '', password: '' });
  const [signup, setSignup] = useState({ userId: '', password: '', confirmPassword: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [compress, setCompress] = useState('none');
  const [category, setCategory] = useState('Others');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedVersions, setSelectedVersions] = useState({});

  // Real-time Stats
  const [stats, setStats] = useState({ totalFiles: 0, storageUsedKB: 0, storageUsedMB: 0 });
  const [currentUserId, setCurrentUserId] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter states
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('https://backend-app-602854698306.asia-south1.run.app/api/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(login) 
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      setToken(data.token);
      setUserRole(data.role);
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
      const res = await fetch('https://backend-app-602854698306.asia-south1.run.app/api/signup', { 
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

  const fetchFiles = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('https://backend-app-602854698306.asia-south1.run.app/api/files', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (!res.ok) throw new Error('Failed to fetch files');
      const data = await res.json();
      setFiles(data);
      
      // Calculate real-time stats
      const totalFiles = data.length;
      const storageUsedKB = data.reduce((sum, f) => sum + parseFloat(f.size || 0), 0);
      const storageUsedMB = storageUsedKB / 1024;
      
      setStats({ totalFiles, storageUsedKB, storageUsedMB });
      
      const init = {};
      data.forEach(f => { init[f.id] = f.version; });
      setSelectedVersions(init);
    } catch (err) {
      setError('Failed to fetch files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line
  }, [token]);

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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setError('');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('compress', compress);
    form.append('category', category === 'OtherText' ? customCategory : category);
    try {
      const res = await fetch('https://backend-app-602854698306.asia-south1.run.app/api/files/upload', { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: form 
      });
      if (!res.ok) throw new Error('Upload failed');
      await res.json();
      setFile(null);
      // Refresh files and stats
      await fetchFiles();
    } catch (err) { 
      setError('Upload failed'); 
    }
    setLoading(false);
  };

  const handleDownload = async (fileId, name, fileType, version) => {
    setError('');
    try {
      const urlPath = version ? 
        `https://backend-app-602854698306.asia-south1.run.app/api/files/download/${fileId}/version/${version}` : 
        `https://backend-app-602854698306.asia-south1.run.app/api/files/download/${fileId}`;
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

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={brandTitle}>ClearBoard</h1>
          <div style={brandSub}>Secure File Portal</div>
          
          {!isSignup ? (
            <div>
              <label style={label}>User ID</label>
              <input 
                type="text" 
                placeholder="User ID" 
                value={login.userId} 
                onChange={e => setLogin({ ...login, userId: e.target.value })} 
                style={input} 
              />
              <label style={{ ...label, marginTop: 10 }}>Password</label>
              <input 
                type="password" 
                placeholder="Password" 
                value={login.password} 
                onChange={e => setLogin({ ...login, password: e.target.value })} 
                style={input} 
              />
              <button 
                onClick={handleLogin} 
                disabled={loading} 
                style={{ ...primaryBtn, marginTop: 12 }}
              >
                {loading ? 'Signing in...' : 'Login'}
              </button>
              {error && <div style={{ color: 'crimson', marginTop: 10, textAlign: 'center', fontSize: 14 }}>{error}</div>}
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 14, color: '#64748b' }}>Don't have an account? </span>
                <button onClick={() => { setIsSignup(true); setError(''); }} style={toggleBtn}>
                  Sign Up
                </button>
              </div>
            </div>
          ) : (
            <div>
              <label style={label}>User ID</label>
              <input 
                type="text" 
                placeholder="Choose a User ID" 
                value={signup.userId} 
                onChange={e => setSignup({ ...signup, userId: e.target.value })} 
                style={input} 
              />
              <label style={{ ...label, marginTop: 10 }}>Password</label>
              <input 
                type="password" 
                placeholder="Password (min 6 characters)" 
                value={signup.password} 
                onChange={e => setSignup({ ...signup, password: e.target.value })} 
                style={input} 
              />
              <label style={{ ...label, marginTop: 10 }}>Confirm Password</label>
              <input 
                type="password" 
                placeholder="Confirm Password" 
                value={signup.confirmPassword} 
                onChange={e => setSignup({ ...signup, confirmPassword: e.target.value })} 
                style={input} 
              />
              <button 
                onClick={handleSignup} 
                disabled={loading} 
                style={{ ...primaryBtn, marginTop: 12 }}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
              {error && <div style={{ color: 'crimson', marginTop: 10, textAlign: 'center', fontSize: 14 }}>{error}</div>}
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <span style={{ fontSize: 14, color: '#64748b' }}>Already have an account? </span>
                <button onClick={() => { setIsSignup(false); setError(''); }} style={toggleBtn}>
                  Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={container}>
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
                  onChange={e => setFile(e.target.files[0])} 
                  style={input} 
                />
              </div>
              <div>
                <label style={label}>Category</label>
                <select value={category} onChange={e => setCategory(e.target.value)} style={select}>
                  {CATEGORY_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                  <option value="OtherText">Other (type below)</option>
                </select>
                {category === 'OtherText' && (
                  <input 
                    type="text" 
                    placeholder="Custom category" 
                    value={customCategory} 
                    onChange={e => setCustomCategory(e.target.value)} 
                    style={{ ...input, marginTop: 8 }} 
                  />
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
                  disabled={loading || !file} 
                  style={smallBtn}
                >
                  {loading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
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
              {filteredFiles.length === 0 && (
                <tr>
                  <td style={{ ...tdStyle, textAlign: 'center', padding: 32, color: '#64748b' }} colSpan={userRole === 'admin' ? 10 : 9}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>
                      {filterCategory || filterDateFrom || filterDateTo ? '🔍' : '📂'}
                    </div>
                    {filterCategory || filterDateFrom || filterDateTo 
                      ? 'No files match the selected filters' 
                      : 'Select filters above to view files'}
                  </td>
                </tr>
              )}
              {filteredFiles.map((f, idx) => (
                <tr key={f.id} style={zebra(idx)}>
                  <td style={{ ...tdStyle, fontWeight: 500, fontSize: 11 }}>{f.name}</td>
                  <td style={tdStyle}>
                    <span style={{ ...pill, background: '#e0e7ff', color: '#4338ca' }}>
                      {f.fileType || 'N/A'}
                    </span>
                  </td>
                  <td style={tdStyle}>{f.size}</td>
                  <td style={tdStyle}>
                    <span style={{ ...pill, background: f.compressionType === 'none' ? '#f1f5f9' : '#dcfce7', color: f.compressionType === 'none' ? '#64748b' : '#166534' }}>
                      {f.compressionType}
                    </span>
                  </td>
                  <td style={tdStyle}>{f.category}</td>
                  <td style={tdStyle}>
                    <select
                      value={selectedVersions[f.id] ?? f.version}
                      onChange={e => setSelectedVersions({ ...selectedVersions, [f.id]: Number(e.target.value) })}
                      style={{ ...select, padding: '4px 8px', width: 70, fontSize: 11, height: 24 }}
                    >
                      {(f.versions || [{ version: f.version, id: f.id }]).map(v => (
                        <option key={v.version} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                  </td>
                  {userRole === 'admin' && (
                    <td style={tdStyle}>
                      <span style={userBadge}>
                        {f.ownerUserId}
                      </span>
                    </td>
                  )}
                  <td style={{ ...tdStyle, fontSize: 12, fontFamily: 'Consolas, Monaco, monospace' }}>
                    {f.uploadedAt ? new Date(f.uploadedAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: 12, fontFamily: 'Consolas, Monaco, monospace' }}>
                    {f.modifiedAt ? new Date(f.modifiedAt).toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td style={tdStyle}>
                    <button 
                      onClick={() => handleDownload(f.id, f.name, f.fileType, selectedVersions[f.id])} 
                      style={{ ...smallBtn, padding: '4px 10px', fontSize: 11, height: 24 }}
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))} 
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FileList;