import { Outlet } from 'react-router'
import Navbar from './Navbar.jsx'

function Layout() {
  return (
    <div className="cb-app">
      <Navbar />
      <main className="cb-main">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout


