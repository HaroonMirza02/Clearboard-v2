import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import ReCAPTCHA from 'react-google-recaptcha';
import { API_ENDPOINTS } from '../utils/api';
import '../styles/auth.css';
import GoogleSignInButton from './GoogleSignInButton';

function Signup() {
  const [step, setStep] = useState(1); // 1: User, 2: Organization, 3: Invitations
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('Software Development');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  // Organization Step
  const [createOrganization, setCreateOrganization] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  // Invitations Step
  const [invitedMembers, setInvitedMembers] = useState(['']);
  const [customMessage, setCustomMessage] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleNext = () => {
    if (step === 1) {
      if (!userId || !email || !password || password !== confirmPassword || !otpVerified || !recaptchaToken) {
        setError('Please complete all required fields and verify your email.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (createOrganization && !organizationName) {
        setError('Please enter an organization name.');
        return;
      }
      setStep(3);
    }
    setError('');
  };

  const handleBack = () => {
    setStep(step - 1);
    setError('');
  };

  const handleAddInvite = () => setInvitedMembers([...invitedMembers, '']);
  const handleInviteChange = (index, value) => {
    const updated = [...invitedMembers];
    updated[index] = value;
    setInvitedMembers(updated);
  };

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
          createOrganization,
          organizationName,
          invitedMembers: invitedMembers.filter(e => emailRegex.test(e)),
          customMessage,
          'g-recaptcha-response': recaptchaToken
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Signup failed');
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  const sendOtp = async () => {
    if (!emailRegex.test(email)) return setError('Valid email is required');
    try {
      const res = await fetch(API_ENDPOINTS.SEND_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error('Failed to send OTP');
      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyOtp = async () => {
    try {
      const res = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Invalid OTP');
      setOtpVerified(true);
      setVerificationToken(data.verificationToken);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container" style={{ maxWidth: '500px' }}>
      <div className="auth-header">
        <h2>{step === 1 ? 'Create Account' : step === 2 ? 'Organization Setup' : 'Invite Members'}</h2>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', justifyContent: 'center' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ width: '30px', height: '4px', background: step >= i ? '#2563eb' : '#e2e8f0', borderRadius: '2px' }} />
          ))}
        </div>
      </div>

      <div className="auth-form">
        {step === 1 && (
          <>
            <div className="form-group">
              <label>User ID</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Email Verification</label>
              <div className="email-verification-group">
                <input placeholder="Code" value={otp} onChange={e => setOtp(e.target.value)} disabled={!otpSent} />
                <button type="button" onClick={otpSent ? verifyOtp : sendOtp} disabled={otpVerified}>
                  {otpVerified ? 'Verified' : (otpSent ? 'Verify' : 'Send Code')}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {password && (
              <div className="password-requirements" style={{ fontSize: '12px', marginBottom: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                <p style={{ margin: '0 0 5px 0', fontWeight: 600 }}>Password must include:</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  <li style={{ color: password.length >= 8 ? '#16a34a' : '#94a3b8' }}>{password.length >= 8 ? '✓' : '○'} At least 8 characters</li>
                  <li style={{ color: /[A-Z]/.test(password) ? '#16a34a' : '#94a3b8' }}>{/[A-Z]/.test(password) ? '✓' : '○'} One uppercase letter</li>
                  <li style={{ color: /[a-z]/.test(password) ? '#16a34a' : '#94a3b8' }}>{/[a-z]/.test(password) ? '✓' : '○'} One lowercase letter</li>
                  <li style={{ color: /\d/.test(password) ? '#16a34a' : '#94a3b8' }}>{/\d/.test(password) ? '✓' : '○'} One number</li>
                  <li style={{ color: /[^A-Za-z0-9]/.test(password) ? '#16a34a' : '#94a3b8' }}>{/[^A-Za-z0-9]/.test(password) ? '✓' : '○'} One special character</li>
                </ul>
              </div>
            )}
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            <div className="form-group">
              <ReCAPTCHA ref={recaptchaRef} sitekey="6Lc0MesrAAAAAA1cZG8eHLy-Xsh_W-NoMD8WgUH_" onChange={setRecaptchaToken} />
            </div>
            <button
              className="submit-button"
              onClick={handleNext}
              disabled={!userId || !email || !otpVerified || !password || password !== confirmPassword || !meetsRules(password).all || !recaptchaToken}
            >
              Continue
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <input type="checkbox" id="createOrg" checked={createOrganization} onChange={e => setCreateOrganization(e.target.checked)} />
              <label htmlFor="createOrg" style={{ margin: 0, fontWeight: 600 }}>Create a new professional organization</label>
            </div>
            {createOrganization && (
              <div className="form-group">
                <label>Organization Name</label>
                <input placeholder="e.g. Acme Corp" value={organizationName} onChange={e => setOrganizationName(e.target.value)} />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Setup your company professionally like Confluence or Google Drive.</p>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="submit-button" style={{ background: '#94a3b8' }} onClick={handleBack}>Back</button>
              <button className="submit-button" onClick={handleNext}>Continue</button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="form-group">
              <label>Invite Team Members</label>
              {invitedMembers.map((email, idx) => (
                <input
                  key={idx}
                  type="email"
                  placeholder="name@company.com"
                  style={{ marginBottom: '8px' }}
                  value={email}
                  onChange={e => handleInviteChange(idx, e.target.value)}
                />
              ))}
              <button type="button" onClick={handleAddInvite} style={{ background: 'none', border: 'none', color: '#2563eb', padding: 0, cursor: 'pointer', fontSize: '14px' }}>
                + Add another member
              </button>
            </div>
            <div className="form-group">
              <label>Customize Invitation Message</label>
              <textarea
                placeholder="Hi team, join us on ClearBoard..."
                value={customMessage}
                onChange={e => setCustomMessage(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="submit-button" style={{ background: '#94a3b8' }} onClick={handleBack}>Back</button>
              <button className="submit-button" onClick={handleSubmit}>Finish & Send Invites</button>
            </div>
          </>
        )}

        {error && <div className="error-message" style={{ marginTop: '16px' }}>{error}</div>}
        {success && <div style={{ color: 'green', fontSize: '.9rem', marginTop: '16px', textAlign: 'center' }}>{success}</div>}
      </div>

      <div className="auth-footer" style={{ marginTop: '20px', textAlign: 'center' }}>
        Already have an account? <Link to="/login">Login</Link>
      </div>
    </div>
  );
}

export default Signup;
