import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import './AdminLayout.css'

function AdminLayout() {
  const location = useLocation();
  const isCEOPortalFlow = location.pathname === '/admin-dashboard';

  return (
    <div className="cb-app">
      {isCEOPortalFlow ? (
        <div className="admin-navbar-minimal">
          <div className="admin-brand">ClearBoard</div>
        </div>
      ) : (
        <Navbar />
      )}
      <main className={isCEOPortalFlow ? 'cb-main admin-main' : 'cb-main'}>
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
