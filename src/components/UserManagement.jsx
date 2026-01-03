import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../utils/api';

const ROLE_DESCRIPTIONS = {
    admin: "Full control over organization data and users.",
    manager: "Can approve files and manage teams.",
    contributor: "Can upload drafts and edit own files.",
    'read-only': "Restricted to viewing approved documentation only."
};

function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const companyId = localStorage.getItem('companyId');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/org/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setUsers(data);
        } catch (err) {
            setError('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (targetUserId, newRole) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/org/update-role`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ targetUserId, role: newRole })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            setSuccess(`Role updated to ${newRole}`);
            fetchUsers();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.message);
            setTimeout(() => setError(''), 3000);
        }
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <div className="user-management-container" style={{ padding: '20px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
            <h2 style={{ marginBottom: '20px', color: '#111827' }}>User Management</h2>

            {error && <div style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</div>}
            {success && <div style={{ color: '#16a34a', marginBottom: '16px' }}>{success}</div>}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                        <th style={{ padding: '12px' }}>User ID</th>
                        <th style={{ padding: '12px' }}>Email</th>
                        <th style={{ padding: '12px' }}>Role</th>
                        <th style={{ padding: '12px' }}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user._id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px' }}>{user.userId}</td>
                            <td style={{ padding: '12px' }}>{user.email || 'N/A'}</td>
                            <td style={{ padding: '12px' }}>
                                <span className={`role-pill ${user.role}`} style={{
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    textTransform: 'capitalize',
                                    backgroundColor: user.role === 'admin' ? '#fee2e2' : user.role === 'manager' ? '#fef3c7' : '#dcfce7',
                                    color: user.role === 'admin' ? '#991b1b' : user.role === 'manager' ? '#92400e' : '#166534'
                                }}>
                                    {user.role}
                                </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                                <select
                                    value={user.role}
                                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                                    style={{ padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }}
                                >
                                    {Object.keys(ROLE_DESCRIPTIONS).map(r => (
                                        <option key={r} value={r} title={ROLE_DESCRIPTIONS[r]}>
                                            {r.charAt(0).toUpperCase() + r.slice(1)}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                                    {ROLE_DESCRIPTIONS[user.role]}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default UserManagement;
