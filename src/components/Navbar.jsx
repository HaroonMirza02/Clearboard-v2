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
    setUserRole(role || '');

    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    const handleAuthChanged = () => {
      setUserRole(localStorage.getItem('role') || '');
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('auth-changed', handleAuthChanged);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    setShowDropdown(false);
    navigate('/');
    window.location.reload(); // Force re-render to show login screen
  };

  const handleSignIn = () => {
    if (localStorage.getItem('token')) {
      navigate('/dashboard');
    } else {
      navigate('/department');
    }
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
        {localStorage.getItem('token') ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 999, background: '#eef2ff', color: '#1f2a37', fontWeight: 600, boxShadow: '0 4px 16px rgba(99,102,241,0.15)' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                {String(localStorage.getItem('userId') || 'U').slice(0,1).toUpperCase()}
              </div>
              <span style={{ fontSize: 14 }}>{localStorage.getItem('userId') || 'User'}</span>
              {userRole === 'admin' && (
                <span style={{ padding: '4px 8px', borderRadius: 6, background: '#dc2626', color: '#fff', fontSize: 11, fontWeight: 700 }}>ADMIN</span>
              )}
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                color: '#fff',
                border: '1px solid #1e3a8a',
                boxShadow: '0 6px 18px rgba(29,78,216,0.25)',
                fontWeight: 700,
                letterSpacing: 0.2,
                cursor: 'pointer',
                transition: 'transform .06s ease, box-shadow .2s ease'
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Dashboard
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: '10px 16px',
                borderRadius: 999,
                background: 'linear-gradient(135deg,#111827,#1f2937)',
                color: '#fff',
                border: '1px solid #0f172a',
                boxShadow: '0 6px 18px rgba(15,23,42,0.25)',
                fontWeight: 700,
                letterSpacing: 0.2,
                cursor: 'pointer',
                transition: 'transform .06s ease, box-shadow .2s ease'
              }}
              onMouseDown={e => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={e => (e.currentTarget.style.transform = 'translateY(0)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              Logout
            </button>
          </div>
        ) : (
          <>
            <button className="cb-nav-signin" onClick={handleSignIn}>LogIn</button>
            <NavLink to="/department" className="cb-nav-cta">Sign Up</NavLink>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;