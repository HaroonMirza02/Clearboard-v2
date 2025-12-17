import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import ReCAPTCHA from 'react-google-recaptcha';
import { API_ENDPOINTS } from '../utils/api';
import '../styles/auth.css';
import GoogleSignInButton from './GoogleSignInButton';

function Signup() {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  const departments = [
    { value: 'Software Development', label: 'Software Development' },
    { value: 'Business Development', label: 'Business Development' },
  ];

  // If already authenticated, redirect to dashboard
  if (typeof window !== 'undefined' && localStorage.getItem('token')) {
    navigate('/dashboard');
  }

  const meetsRules = (pwd) => {
    const lengthOk = pwd.length >= 8;
    const lowerOk = /[a-z]/.test(pwd);
    const upperOk = /[A-Z]/.test(pwd);
    const numberOk = /\d/.test(pwd);
    const specialOk = /[^A-Za-z0-9]/.test(pwd);
    return { lengthOk, lowerOk, upperOk, numberOk, specialOk, all: lengthOk && lowerOk && upperOk && numberOk && specialOk };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email) return setError('Email is required');
    if (!department) return setError('Please select a department');
    if (password !== confirmPassword) return setError('Passwords do not match');
    const rules = meetsRules(password);
    if (!rules.all) return setError('Password does not meet requirements');
    if (!recaptchaToken) return setError('Please complete the reCAPTCHA verification.');

    try {
      const res = await fetch(API_ENDPOINTS.SIGNUP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          password,
          email,
          department,
          verificationToken,
          'g-recaptcha-response': recaptchaToken
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Signup failed');
      setSuccess('Account created. Redirecting to login...');
      setTimeout(() => navigate('/login'), 800);

      // Reset reCAPTCHA after success
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setRecaptchaToken(null);

    } catch (err) {
      setError(err.message || 'Signup failed');
      if (recaptchaRef.current) recaptchaRef.current.reset();
      setRecaptchaToken(null);
    }
  };

  const sendOtp = async () => {
    setError('');
    if (!email) return setError('Enter email first');
    try {
      const res = await fetch(API_ENDPOINTS.SEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to send OTP');
      setOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    }
  };

  const verifyOtp = async () => {
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Invalid OTP');
      setOtpVerified(true);
      setVerificationToken(data.verificationToken || '');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    }
  };

  const onRecaptchaChange = (token) => {
    setRecaptchaToken(token);
  };
  const onRecaptchaExpired = () => {
    setRecaptchaToken(null);
  };
  const onRecaptchaError = () => {
    setRecaptchaToken(null);
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h2>Create Account</h2>
      </div>

      {/* Google Sign-In Button */}
      <div style={{ marginBottom: '20px' }}>
        <GoogleSignInButton />
      </div>

      {/* Divider */}
      <div className="auth-divider">
        <span>OR</span>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Select Department *</label>
          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          >
            <option value="">-- Choose a department --</option>
            {departments.map((dept) => (
              <option key={dept.value} value={dept.value}>
                {dept.label}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>User ID</label>
          <input value={userId} onChange={e => setUserId(e.target.value)} autoFocus required />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Email Verification OTP</label>
          <div className="email-verification-group">
            <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} disabled={!otpSent} />
            <button
              type="button"
              className={`verify-button ${otpVerified ? 'verified' : ''}`}
              onClick={otpVerified ? undefined : (otpSent ? verifyOtp : sendOtp)}
              disabled={otpVerified}
            >
              {otpVerified ? 'Verified' : (otpSent ? 'Verify OTP' : 'Send OTP')}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Confirm Password</label>
          <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
        </div>

        {/* Dynamic password requirements */}
        {(() => {
          const r = meetsRules(password);
          return !r.all ? (
            <div className="password-requirements">
              <p>Password must include:</p>
              <ul>
                <li className={r.lengthOk ? 'ok' : ''}>Minimum 8 characters</li>
                <li className={r.lowerOk && r.upperOk ? 'ok' : ''}>Lowercase and UPPERCASE letters</li>
                <li className={r.numberOk ? 'ok' : ''}>Numbers (0-9)</li>
                <li className={r.specialOk ? 'ok' : ''}>Special characters (!@#$%^&* etc.)</li>
              </ul>
            </div>
          ) : null;
        })()}

        {/* ✅ reCAPTCHA Section */}
        <div className="form-group" style={{ marginTop: '1rem' }}>
          <ReCAPTCHA
            ref={recaptchaRef}
            sitekey="6Lc0MesrAAAAAA1cZG8eHLy-Xsh_W-NoMD8WgUH_"
            onChange={onRecaptchaChange}
            onExpired={onRecaptchaExpired}
            onErrored={onRecaptchaError}
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div style={{ color: 'green', fontSize: '.9rem' }}>{success}</div>}

        <button
          type="submit"
          className="submit-button"
          disabled={!otpVerified || !recaptchaToken || !department}
        >
          Create Account
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}

export default Signup;
