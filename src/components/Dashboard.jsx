import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import FileUploader from './FileUploader.jsx'
import FileList from './FileList.jsx'
import FacetedFileList from './FacetedFileList.jsx'
import UserManagement from './UserManagement.jsx'

function Dashboard() {
  const isAuthed = Boolean(localStorage.getItem('token'))
  const role = localStorage.getItem('role') || ''
  const department = localStorage.getItem('department') || ''

  // View mode: 'files' or 'users'
  const [activeTab, setActiveTab] = useState('files')

  if (!isAuthed) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="cb-dashboard">
      {role === 'admin' && (
        <div className="dashboard-tabs" style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '20px',
          padding: '10px 20px',
          borderBottom: '1px solid #e2e8f0'
        }}>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'files' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'files' ? '#2563eb' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            📂 Files
          </button>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '10px 0',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === 'users' ? '#2563eb' : '#64748b',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            👥 User Management
          </button>
        </div>
      )}

      {activeTab === 'users' && role === 'admin' ? (
        <UserManagement />
      ) : (
        <FileList />
      )}
    </section>
  )
}

export default Dashboard
