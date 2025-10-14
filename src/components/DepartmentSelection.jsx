import { useNavigate } from 'react-router';
import '../styles/auth.css';

function DepartmentSelection() {
  const navigate = useNavigate();

  const departments = [
    { key: 'software', name: 'Software Development', accent: '#2563eb' },
    { key: 'data', name: 'Data and Research Analyst', accent: '#059669' },
    { key: 'business', name: 'Business Development', accent: '#f59e0b' },
    { key: 'admin', name: 'Admin', accent: '#ef4444' },
  ];

  const handleSelect = (deptName) => {
    const path = deptName === 'Admin' ? '/login' : '/login';
    navigate(`${path}?dept=${encodeURIComponent(deptName)}`);
  };

  return (
    <div className="dept-page">
      <div className="dept-wrap">
        <div className="dept-header">
          <h1 className="dept-title">Select Your Department</h1>
          <p className="dept-subtitle">Choose your department to continue to authentication</p>
        </div>
        <div className="dept-grid">
          {departments.map(d => (
            <button
              key={d.key}
              onClick={() => handleSelect(d.name)}
              className="dept-card"
            >
              <div className="dept-card-head">
                <div className="dept-icon" style={{ background: d.accent }}>
                  {d.name.split(' ').map(w => w[0]).join('').slice(0,2)}
                </div>
                <div>
                  <div className="dept-name">{d.name}</div>
                  {d.name === 'Admin' ? (
                    <div className="dept-note admin">Login only. Signup disabled.</div>
                  ) : (
                    <div className="dept-note">Proceed to login or create account</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DepartmentSelection;


