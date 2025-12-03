import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import ReCAPTCHA from 'react-google-recaptcha';
import '../styles/auth.css';
import { API_ENDPOINTS } from '../utils/api';

function Login({ onLogin }) {
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
          'g-recaptcha-response': recaptchaToken,
        }),
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      if (data.department) localStorage.setItem('department', data.department);
      if (data.userId) localStorage.setItem('userId', data.userId);
      
      // Calculate and store the exact time the session should expire
      const expiryTime = new Date().getTime() + 15 * 60 * 1000; // 15 minutes from now
      localStorage.setItem('sessionExpiry', expiryTime);

      try {
        window.dispatchEvent(new Event('auth-changed'));
      } catch {}

      if (onLogin) onLogin();

      // Redirect admins (CEO) to the admin dashboard, others to the regular dashboard
      if (data.role === 'admin') {
        navigate('/admin-dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials');
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setRecaptchaToken(null);
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
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>User ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* ✅ reCAPTCHA added here */}
        <div className="form-group" style={{ marginTop: '10px', transform: 'scale(0.95)', transformOrigin: 'left' }}>
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey="6Lc0MesrAAAAAA1cZG8eHLy-Xsh_W-NoMD8WgUH_" // your site key
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
          Login
        </button>
      </form>

      {/* Forgot Password */}
      <div className="auth-footer" style={{ marginTop: '10px' }}>
        <button className="link-button" onClick={handleForgotPassword}>
          Forgot Password?
        </button>
      </div>

      <div className="auth-footer">
        Don't have an account?{' '}
        <Link to="/signup">
          Create new account
        </Link>
      </div>
    </div>
  );
}

export default Login;
