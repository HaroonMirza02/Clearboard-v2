import { useMemo } from 'react'
import { Navigate } from 'react-router'
import FileUploader from './FileUploader.jsx'
import FileList from './FileList.jsx'

function Dashboard() {
  const isAuthed = Boolean(localStorage.getItem('token'))
  const role = localStorage.getItem('role') || ''
  const department = localStorage.getItem('department') || ''

  if (!isAuthed) {
    return <Navigate to="/login" replace />
  }

  return (
    <section className="cb-dashboard">
      <FileList />
    </section>
  )
}

export default Dashboard


