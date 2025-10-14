import { useMemo } from 'react'
import { useLocation, Navigate } from 'react-router'
import FileUploader from './FileUploader.jsx'
import FileList from './FileList.jsx'

function Dashboard() {
  const location = useLocation()
  const isAuthed = Boolean(localStorage.getItem('token'))
  const role = localStorage.getItem('role') || ''
  const department = localStorage.getItem('department') || ''
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const selectedDept = params.get('dept') || department || ''

  if (!isAuthed) {
    return <Navigate to={`/login${selectedDept ? `?dept=${encodeURIComponent(selectedDept)}` : ''}`} replace />
  }

  return (
    <section className="cb-dashboard">
      <FileList />
    </section>
  )
}

export default Dashboard


