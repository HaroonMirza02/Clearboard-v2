import { Link, NavLink } from 'react-router'

function Navbar() {
  return (
    <nav className="cb-navbar">
      <div className="cb-nav-left">
        <Link to="/" className="cb-brand">ClearBoard</Link>
        <ul className="cb-nav-links">
          <li><NavLink to="/" end>Home</NavLink></li>
          <li><NavLink to="/dashboard">Dashboard</NavLink></li>
        </ul>
      </div>
      <div className="cb-nav-right">
        <input className="cb-search" placeholder="Search" />
        <div className="cb-avatar" aria-label="profile" />
      </div>
    </nav>
  )
}

export default Navbar


