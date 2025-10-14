import { useState, useMemo } from 'react';
import { useLocation, Link, useNavigate } from 'react-router';
import '../styles/auth.css';
import { API_ENDPOINTS } from '../utils/api';

function Login({ onLogin }) {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
    const [success, setSuccess] = useState(''); // Add success state


  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const selectedDept = params.get('dept') || '';

  // If already authenticated, redirect to dashboard
  if (typeof window !== 'undefined' && localStorage.getItem('token')) {
    navigate('/dashboard');
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, password, department: selectedDept })
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role); // Store role as well
      if (data.department) {
        localStorage.setItem('department', data.department);
      }
      if (data.userId) {
        localStorage.setItem('userId', data.userId);
      }
      try { window.dispatchEvent(new Event('auth-changed')); } catch {}
      if (onLogin) onLogin();
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');
    const email = prompt('Please enter your registered email address:');
    if (!email) return;

    try {
      const res = await fetch(API_ENDPOINTS.FORGOT_PASSWORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setSuccess('If an account exists for that email, a reset link has been sent.');

    } catch (err) {
      setError(err.message || 'Failed to send reset link.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Login</h2>
        {selectedDept && (
          <p>Department: <strong>{selectedDept}</strong></p>
        )}
      </div>
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>User ID</label>
          <input value={userId} onChange={e => setUserId(e.target.value)} autoFocus required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

        <button type="submit" className="submit-button">Login</button>
      </form>
            {/* Add Forgot Password Link */}
      <div className="auth-footer" style={{ marginTop: '10px' }}>
        <button className="link-button" onClick={handleForgotPassword}>
          Forgot Password?
        </button>
      </div>
      
      {selectedDept.toLowerCase() !== 'admin' && (
        <div className="auth-footer">
          Don't have an account? <Link to={`/signup?dept=${encodeURIComponent(selectedDept)}`}>Create new account</Link>
        </div>
      )}
      {selectedDept.toLowerCase() === 'admin' && (
        <div className="auth-footer" style={{ color: '#ef4444', fontWeight: 600 }}>
          Admin accounts are restricted. Signup is disabled.
        </div>
      )}
    </div>
  );
}

export default Login;