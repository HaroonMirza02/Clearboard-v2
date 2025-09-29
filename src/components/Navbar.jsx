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
        <div className="cb-avatar-wrapper" ref={dropdownRef}>
          <div 
            className="cb-avatar" 
            aria-label="profile"
            onClick={() => setShowDropdown(!showDropdown)}
            style={{ cursor: 'pointer' }}
          >
            {userRole === 'admin' && (
              <span style={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                background: '#dc2626',
                borderRadius: '50%',
                border: '2px solid white'
              }} />
            )}
          </div>
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 6px 28px rgba(16,24,40,0.12)',
              minWidth: 180,
              padding: '8px 0',
              zIndex: 1000
            }}>
              <div style={{
                padding: '10px 16px',
                borderBottom: '1px solid #f1f5f9',
                fontSize: 13,
                color: '#64748b',
                fontWeight: 600
              }}>
                {userRole === 'admin' ? 'Admin Account' : 'User Account'}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  textAlign: 'left',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  color: '#dc2626',
                  fontWeight: 600,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#fef2f2'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;