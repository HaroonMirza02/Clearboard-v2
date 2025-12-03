import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../utils/api'; // Make sure this path is correct
import '../styles/Navbar.css'; // Import the new CSS file

function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [is2faEnabled, setIs2faEnabled] = useState(false);
    const [currentUser, setCurrentUser] = useState({ id: '', role: '' });
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Fetch user status (including 2FA) when component mounts or token changes
    const fetchUserData = async (token) => {
        try {
            const res = await fetch(API_ENDPOINTS.USER_STATUS, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Could not fetch user status');
            const data = await res.json();
            setIs2faEnabled(data.isTwoFactorEnabled || false);
        } catch (err) {
            console.error("Failed to fetch user status:", err);
        }
    };

    useEffect(() => {
        const handleAuthChange = () => {
            const token = localStorage.getItem('token');
            const userId = localStorage.getItem('userId');
            const role = localStorage.getItem('role');

            if (token && userId) {
                setCurrentUser({ id: userId, role: role || '' });
                fetchUserData(token);
            } else {
                setCurrentUser({ id: '', role: '' });
            }
        };

        handleAuthChange(); // Initial check
        window.addEventListener('auth-changed', handleAuthChange);
        
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('auth-changed', handleAuthChange);
        };
    }, []);
    
    // --- Actions ---

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userId');
        setIsMenuOpen(false);
        window.dispatchEvent(new Event('auth-changed'));
        navigate('/');
    };
    
    const handleChangePassword = async () => {
        setIsMenuOpen(false);
        try {
            const token = localStorage.getItem('token');
            if (!token) throw new Error('You are not logged in.');

            const res = await fetch(API_ENDPOINTS.CHANGE_PASSWORD, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            alert('A password reset link has been sent to your registered email address.');
        } catch (err) {
            alert(err.message || 'Failed to send reset link.');
        }
    };

    const handleToggle2FA = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        
        const newState = !is2faEnabled;
        try {
            const res = await fetch(API_ENDPOINTS.TOGGLE_2FA, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ enable: newState }),
            });
            if (!res.ok) throw new Error('Failed to update 2FA status');
            
            setIs2faEnabled(newState); // Update state on success
            alert(`Two-Factor Authentication has been ${newState ? 'enabled' : 'disabled'}.`);
        } catch (err) {
            alert('Could not update 2FA status. Please try again.');
        }
    };

    const userInitial = currentUser.id ? currentUser.id.charAt(0).toUpperCase() : '?';

    return (
        <nav className="cb-navbar">
            <div className="cb-nav-left">
                <Link to="/" className="cb-brand">ClearBoard</Link>
                <ul className="cb-nav-links">
                    <li><a href="/#features">Features</a></li>
                    <li><a href="/about">About</a></li>
                </ul>
            </div>
            <div className="cb-nav-right">
                {currentUser.id ? (
                    <div className="user-menu-container" ref={menuRef}>
                        <button className="user-menu-trigger" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                            <div className="user-avatar">{userInitial}</div>
                            <span className="user-name">{currentUser.id}</span>
                        </button>
                        
                        {isMenuOpen && (
                            <div className="dropdown-menu">
                                <div className="dropdown-header">
                                    <div className="username">{currentUser.id}</div>
                                    <div className="role">{currentUser.role}</div>
                                </div>
                                <button className="dropdown-item" onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}>
                                    Dashboard
                                </button>
                                <div className="dropdown-divider"></div>
                                {/* <button className="dropdown-item" onClick={handleToggle2FA}>
                                    {is2faEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                                </button> */}
                                <button className="dropdown-item" onClick={handleChangePassword}>
                                    Change Password
                                </button>
                                <div className="dropdown-divider"></div>
                                <button className="dropdown-item" onClick={handleLogout}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <button className="cb-nav-signin" onClick={() => navigate('/admin-login')} style={{ marginRight: '10px' }}>CEO Portal</button>
                        <button className="cb-nav-signin" onClick={() => navigate('/login')}>Login</button>
                        <Link to="/signup" className="cb-nav-cta">Sign Up</Link>
                    </>
                )}
            </div>
        </nav>
    );
}

export default Navbar;