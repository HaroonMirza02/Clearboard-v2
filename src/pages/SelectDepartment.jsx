import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { API_ENDPOINTS } from '../utils/api';
import '../styles/auth.css';

function SelectDepartment() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [department, setDepartment] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const userId = searchParams.get('userId');

    useEffect(() => {
        if (!userId) {
            setError('Invalid request. Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        }
    }, [userId, navigate]);

    const departments = [
        { value: 'Software Development', label: 'Software Development' },
        { value: 'Business Development', label: 'Business Development' },
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!department) {
            setError('Please select a department');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(API_ENDPOINTS.UPDATE_DEPARTMENT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, department }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to update department');
            }

            // Store authentication data
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            localStorage.setItem('department', data.department);
            localStorage.setItem('userId', data.userId);

            // Calculate and store the exact time the session should expire
            const expiryTime = new Date().getTime() + 15 * 60 * 1000; // 15 minutes from now
            localStorage.setItem('sessionExpiry', expiryTime);

            // Dispatch auth-changed event
            try {
                window.dispatchEvent(new Event('auth-changed'));
            } catch { }

            // Redirect based on role
            if (data.role === 'admin') {
                navigate('/admin-dashboard');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.message || 'Failed to update department');
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-header">
                <h2>Select Your Department</h2>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                    Please select your department to complete registration
                </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Department *</label>
                    <select
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        required
                        autoFocus
                    >
                        <option value="">-- Choose a department --</option>
                        {departments.map((dept) => (
                            <option key={dept.value} value={dept.value}>
                                {dept.label}
                            </option>
                        ))}
                    </select>
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                    type="submit"
                    className="submit-button"
                    disabled={loading || !department}
                    style={{
                        opacity: loading || !department ? 0.7 : 1,
                        cursor: loading || !department ? 'not-allowed' : 'pointer',
                    }}
                >
                    {loading ? 'Processing...' : 'Continue'}
                </button>
            </form>
        </div>
    );
}

export default SelectDepartment;
