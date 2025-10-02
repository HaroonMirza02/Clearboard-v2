import { Link, NavLink, useNavigate } from 'react-router';
import { useState, useEffect, useRef } from 'react';

function Navbar() {
  const [showDropdown, setShowDropdown] = useState(false);
  const [userRole, setUserRole] = useState('');
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Get user role from localStorage
    const role = localStorage.getItem('role');
    setUserRole(role || 'user');

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    setShowDropdown(false);
    navigate('/');
    window.location.reload(); // Force re-render to show login screen
  };

  const handleSignIn = () => {
    navigate('/dashboard');
  };

  return (
    <nav className="cb-navbar">
      <div className="cb-nav-left">
        <Link to="/" className="cb-brand">
          {/* <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="cb-brand-icon">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg> */}
          ClearBoard
        </Link>
        <ul className="cb-nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#about">About</a></li>
        </ul>
      </div>
      <div className="cb-nav-right">
        <button className="cb-nav-signin" onClick={handleSignIn}>Sign In</button>
        <NavLink to="/dashboard" className="cb-nav-cta">Get Started</NavLink>
      </div>
    </nav>
  );
}

export default Navbar;