import { useMemo, useState } from 'react'
import { Navigate } from 'react-router'
import FileUploader from './FileUploader.jsx'
import FileList from './FileList.jsx'
import FacetedFileList from './FacetedFileList.jsx'

function Dashboard() {
  const isAuthed = Boolean(localStorage.getItem('token'))
  const role = localStorage.getItem('role') || ''
  const department = localStorage.getItem('department') || ''

  // View mode: 'table' or 'grid'
  const [viewMode, setViewMode] = useState('grid') // Default to grid view

  if (!isAuthed) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="cb-dashboard">
      {/* View Mode Toggle */}
      <div style={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 100,
        background: 'white',
        borderRadius: 10,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        padding: 4,
        display: 'flex',
        gap: 4
      }}>
        <button
          onClick={() => setViewMode('grid')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 8,
            background: viewMode === 'grid' ? '#3b82f6' : 'transparent',
            color: viewMode === 'grid' ? 'white' : '#6b7280',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          🎨 Grid View
        </button>
        <button
          onClick={() => setViewMode('table')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: 8,
            background: viewMode === 'table' ? '#3b82f6' : 'transparent',
            color: viewMode === 'table' ? 'white' : '#6b7280',
            fontWeight: 600,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          📋 Table View
        </button>
      </div>

      {/* Render based on view mode */}
      {viewMode === 'grid' ? <FacetedFileList /> : <FileList />}
    </section>
  )
}

export default Dashboard
