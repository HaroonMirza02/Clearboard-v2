import React, { useState } from 'react';

const AdminUserFilter = ({ users, selectedUser, onChange }) => {
  const [search, setSearch] = useState('');
  const filteredUsers = users.filter(u => u.display.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ fontWeight: 600, color: '#334155', marginBottom: 6, display: 'block' }}>Filter by Owner</label>
      <input
        type="text"
        placeholder="Search user..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: 8, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 8 }}
      />
      <select
        value={selectedUser}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e2e8f0' }}
      >
        <option value="">All Users</option>
        {filteredUsers.map(u => (
          <option key={u.userId} value={u.userId}>{u.display}</option>
        ))}
      </select>
    </div>
  );
};

export default AdminUserFilter;
