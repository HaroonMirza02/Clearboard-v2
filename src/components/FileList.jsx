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

const container = { maxWidth: 1180, margin: '0 auto' };
const sectionCard = { background: '#fff', borderRadius: 14, boxShadow: '0 6px 28px rgba(16,24,40,0.06)', padding: 20 };
const uploadGrid = { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 260px) minmax(160px, 220px) auto', gap: 12, alignItems: 'end' };
const select = { ...input };
const smallBtn = { padding: '12px 18px', borderRadius: 10, background: '#2563eb', color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer' };

const tableWrap = { ...sectionCard, padding: 0 };
const tableStyle = { width: '100%', borderCollapse: 'separate', borderSpacing: 0 };
const thStyle = { background: '#f1f5f9', color: '#0f172a', fontWeight: 700, padding: '12px 14px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: 13 };
const tdStyle = { padding: '12px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', fontSize: 14, color: '#0f172a' };
const zebra = idx => ({ background: idx % 2 === 0 ? '#fff' : '#fafbff' });
const pill = { padding: '4px 10px', borderRadius: 999, background: '#eff6ff', color: '#1d4ed8', fontWeight: 600, fontSize: 12, display: 'inline-block' };
const adminBadge = { padding: '6px 12px', borderRadius: 6, background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 12, display: 'inline-block', marginLeft: 12 };

function FileList() {
  const [token, setToken] = useState('');
  const [userRole, setUserRole] = useState('');
  const [login, setLogin] = useState({ userId: '', password: '' });
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [compress, setCompress] = useState('none');
  const [category, setCategory] = useState('Others');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedVersions, setSelectedVersions] = useState({});

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
    } catch (err) { setError('Login failed'); }
    setLoading(false);
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('https://backend-app-602854698306.asia-south1.run.app/api/files', { 
      headers: { Authorization: `Bearer ${token}` } 
    })
      .then(res => { if (!res.ok) throw new Error('Failed to fetch files'); return res.json(); })
      .then(data => {
        setFiles(data);
        const init = {};
        data.forEach(f => { init[f.id] = f.version; });
        setSelectedVersions(init);
      })
      .catch(() => setError('Failed to fetch files'))
      .finally(() => setLoading(false));
  }, [token]);

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
      const filesRes = await fetch('https://backend-app-602854698306.asia-south1.run.app/api/files', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await filesRes.json();
      setFiles(data);
      const init = {};
      data.forEach(f => { init[f.id] = f.version; });
      setSelectedVersions(init);
    } catch (err) { setError('Upload failed'); }
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
    } catch (err) { setError('Download failed'); }
  };

  if (!token) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1 style={brandTitle}>ClearBoard</h1>
          <div style={brandSub}>Secure File Portal</div>
          <form onSubmit={handleLogin}>
            <label style={label}>User ID</label>
            <input type="text" placeholder="User ID" value={login.userId} onChange={e => setLogin({ ...login, userId: e.target.value })} required style={input} />
            <label style={{ ...label, marginTop: 10 }}>Password</label>
            <input type="password" placeholder="Password" value={login.password} onChange={e => setLogin({ ...login, password: e.target.value })} required style={input} />
            <button type="submit" disabled={loading} style={{ ...primaryBtn, marginTop: 12 }}>{loading ? 'Signing in...' : 'Login'}</button>
            {error && <div style={{ color: 'crimson', marginTop: 10, textAlign: 'center' }}>{error}</div>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={container}>
        <div style={{ ...sectionCard, marginBottom: 20 }}>
          <h2 style={{ margin: 0, color: '#1f2a37', display: 'flex', alignItems: 'center' }}>
            Upload a File
            {userRole === 'admin' && <span style={adminBadge}>ADMIN</span>}
          </h2>
          <div style={{ marginTop: 12 }}>
            <form onSubmit={handleUpload}>
              <div style={uploadGrid}>
                <div>
                  <label style={label}>File</label>
                  <input type="file" onChange={e => setFile(e.target.files[0])} required style={input} />
                </div>
                <div>
                  <label style={label}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} style={select}>
                    {CATEGORY_OPTIONS.map(opt => (<option key={opt} value={opt}>{opt}</option>))}
                    <option value="OtherText">Other (type below)</option>
                  </select>
                  {category === 'OtherText' && (
                    <input type="text" placeholder="Custom category" value={customCategory} onChange={e => setCustomCategory(e.target.value)} style={{ ...input, marginTop: 8 }} required />
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
                  <button type="submit" disabled={loading || !file} style={smallBtn}>{loading ? 'Uploading...' : 'Upload'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>

        <div style={tableWrap}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>File Type</th>
                <th style={thStyle}>Size (KB)</th>
                <th style={thStyle}>Compression</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Version</th>
                {userRole === 'admin' && <th style={thStyle}>Owner</th>}
                <th style={thStyle}>Uploaded At</th>
                <th style={thStyle}>Modified At</th>
                <th style={thStyle}>Download</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f, idx) => (
                <tr key={f.id} style={zebra(idx)}>
                  <td style={tdStyle}>{f.name}</td>
                  <td style={tdStyle}><span style={pill}>{f.fileType || '-'}</span></td>
                  <td style={tdStyle}>{f.size}</td>
                  <td style={tdStyle}>{f.compressionType}</td>
                  <td style={tdStyle}>{f.category}</td>
                  <td style={tdStyle}>
                    <select
                      value={selectedVersions[f.id] ?? f.version}
                      onChange={e => setSelectedVersions({ ...selectedVersions, [f.id]: Number(e.target.value) })}
                      style={{ ...select, padding: '8px 10px', width: 120 }}
                    >
                      {(f.versions || [{ version: f.version, id: f.id }]).map(v => (
                        <option key={v.version} value={v.version}>v{v.version}</option>
                      ))}
                    </select>
                  </td>
                  {userRole === 'admin' && (
                    <td style={tdStyle}>
                      <span style={{ ...pill, background: '#fef3c7', color: '#92400e' }}>
                        {f.ownerUserId}
                      </span>
                    </td>
                  )}
                  <td style={tdStyle}>{f.uploadedAt ? new Date(f.uploadedAt).toLocaleString() : '-'}</td>
                  <td style={tdStyle}>{f.modifiedAt ? new Date(f.modifiedAt).toLocaleString() : '-'}</td>
                  <td style={tdStyle}>
                    <button onClick={() => handleDownload(f.id, f.name, f.fileType, selectedVersions[f.id])} style={{ ...smallBtn, padding: '8px 14px' }}>Download</button>
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