import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReCAPTCHA from 'react-google-recaptcha';
import '../styles/auth.css';
import { API_ENDPOINTS } from '../utils/api';

function AdminLogin() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const navigate = useNavigate();

  // Redirect if already logged in
  if (typeof window !== 'undefined' && localStorage.getItem('token')) {
    navigate('/dashboard');
  }

  const onRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };

  const onRecaptchaExpired = () => {
    setRecaptchaToken(null);
  };

  const onRecaptchaError = () => {
    setRecaptchaToken(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!recaptchaToken) {
      setError('Please complete the reCAPTCHA verification.');
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          password,
          department: 'Admin', // Admin always uses Admin department
          'g-recaptcha-response': recaptchaToken,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid admin credentials');
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      if (data.department) localStorage.setItem('department', data.department);
      if (data.userId) localStorage.setItem('userId', data.userId);
      
      // Mark that admin logged in from CEO Portal
      localStorage.setItem('adminLoginSource', 'ceo-portal');
      
      // Calculate and store the exact time the session should expire
      const expiryTime = new Date().getTime() + 15 * 60 * 1000; // 15 minutes from now
      localStorage.setItem('sessionExpiry', expiryTime);

      try {
        window.dispatchEvent(new Event('auth-changed'));
      } catch {}

      setSuccess('Login successful. Redirecting...');
      setTimeout(() => navigate('/admin-dashboard'), 500);
    } catch (err) {
      setError(err.message || 'Login failed');
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setRecaptchaToken(null);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>CEO Portal</h2>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '8px' }}>
          Admin access only
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Admin Username</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label>Admin Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* reCAPTCHA */}
        <div className="form-group" style={{ marginTop: '10px', transform: 'scale(0.95)', transformOrigin: 'left' }}>
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey="6Lc0MesrAAAAAA1cZG8eHLy-Xsh_W-NoMD8WgUH_"
            onChange={onRecaptchaChange}
            onExpired={onRecaptchaExpired}
            onErrored={onRecaptchaError}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <button
          type="submit"
          className="submit-button"
          disabled={!recaptchaToken}
          style={{
            opacity: !recaptchaToken ? 0.7 : 1,
            cursor: !recaptchaToken ? 'not-allowed' : 'pointer',
          }}
        >
          Login as Admin
        </button>
      </form>

      <div className="auth-footer" style={{ marginTop: '10px' }}>
        <p style={{ fontSize: '0.85rem', color: '#999' }}>
          This portal is restricted to authorized administrators only.
        </p>
      </div>
    </div>
  );
}

export default AdminLogin;
