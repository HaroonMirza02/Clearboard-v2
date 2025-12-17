import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import '../styles/auth.css';

function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const token = searchParams.get('token');
        const role = searchParams.get('role');
        const department = searchParams.get('department');
        const userId = searchParams.get('userId');
        const errorParam = searchParams.get('error');

        if (errorParam) {
            setError('Authentication failed. Please try again.');
            setTimeout(() => navigate('/login'), 2000);
            return;
        }

        if (token && role && department && userId) {
            // Store authentication data
            localStorage.setItem('token', token);
            localStorage.setItem('role', role);
            localStorage.setItem('department', department);
            localStorage.setItem('userId', userId);

            // Calculate and store the exact time the session should expire
            const expiryTime = new Date().getTime() + 15 * 60 * 1000; // 15 minutes from now
            localStorage.setItem('sessionExpiry', expiryTime);

            // Dispatch auth-changed event
            try {
                window.dispatchEvent(new Event('auth-changed'));
            } catch { }

            // Redirect based on role
            if (role === 'admin') {
                navigate('/admin-dashboard');
            } else {
                navigate('/dashboard');
            }
        } else {
            setError('Invalid authentication response.');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-header">
                <h2>Authenticating...</h2>
            </div>
            {error ? (
                <div className="error-message">{error}</div>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                    <div className="loading-spinner"></div>
                    <p>Please wait while we complete your sign-in...</p>
                </div>
            )}
        </div>
    );
}

export default AuthCallback;
