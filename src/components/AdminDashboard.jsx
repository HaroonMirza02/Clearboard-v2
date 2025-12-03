
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';


function AdminDashboard() {
  const [activeSection, setActiveSection] = useState(null); // null, 'teams', 'projects', 'softdev', 'busdev', 'userlist'
  const [selectedTeam, setSelectedTeam] = useState(null); // 'softdev' or 'busdev'
  const [selectedUser, setSelectedUser] = useState(null); // userId string
  const navigate = useNavigate();

  // Redirect if not logged in as admin
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const loginSource = localStorage.getItem('adminLoginSource'); // 'user-login' or 'ceo-portal'

  if (!token || role !== 'admin') {
    navigate('/');
    return null;
  }

  // If admin logged in from User Login page, redirect to regular dashboard
  if (loginSource === 'user-login') {
    navigate('/dashboard');
    return null;
  }

  // Teams and users data
  const teams = [
    { key: 'softdev', name: 'Software Development', label: 'Soft Dev', users: [
      { userId: 'Haroon', display: 'Haroon' },
      { userId: 'Zaid', display: 'Zaid' },
      { userId: 'Ibrahim', display: 'Ibrahim' },
    ] },
    { key: 'busdev', name: 'Business Development', label: 'Bus Dev', users: [
      { userId: 'Uzair', display: 'Uzair' },
    ] },
  ];

  const handleTeamsClick = () => {
    setActiveSection('teams');
    setSelectedTeam(null);
    setSelectedUser(null);
  };

  const handleProjectsClick = () => {
    setActiveSection('projects');
    setSelectedTeam(null);
    setSelectedUser(null);
  };

  const handleBack = () => {
    if (selectedUser) {
      setSelectedUser(null);
    } else if (selectedTeam) {
      setSelectedTeam(null);
    } else {
      setActiveSection(null);
    }
  };

  const handleTeamCardClick = (teamKey) => {
    setSelectedTeam(teamKey);
    setSelectedUser(null);
  };

  const handleUserCardClick = (userId) => {
    // Set up read-only dashboard for this user
    // Store a flag in localStorage to indicate admin is viewing as user
    localStorage.setItem('adminViewUser', userId);
    navigate(`/dashboard?user=${userId}&readonly=1`);
  };

  const handleProjectClick = (projectName) => {
    // Store selected project so FileList can pick it up and pre-filter
    try { localStorage.setItem('adminProject', projectName); } catch {}
    // Navigate to the regular dashboard with a project query param
    navigate(`/dashboard?project=${encodeURIComponent(projectName)}`);
  };

  return (
    <div className="admin-dashboard">
      {/* Main Teams/Projects selection */}
      {activeSection === null && (
        <div className="main-cards-container">
          <div className="admin-card teams-card" onClick={handleTeamsClick}>
            <h3>Teams</h3>
            <p>Manage teams and departments</p>
          </div>
          <div className="admin-card projects-card" onClick={handleProjectsClick}>
            <h3>Projects</h3>
            <p>Manage all projects</p>
          </div>
        </div>
      )}

      {/* Teams view: show SoftDev and BusDev cards */}
      {activeSection === 'teams' && !selectedTeam && (
        <div className="expanded-view teams-view">
          <button className="back-button" onClick={handleBack}>← Back</button>
          <div className="top-cards-section">
            {teams.map(team => (
              <div
                key={team.key}
                className={`mini-card ${team.key === 'softdev' ? 'teams-mini' : 'business-mini'}`}
                onClick={() => handleTeamCardClick(team.key)}
                style={{ cursor: 'pointer' }}
              >
                <h3>{team.name}</h3>
                <p>{team.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-team user cards */}
      {activeSection === 'teams' && selectedTeam && !selectedUser && (
        <div className="expanded-view user-list-view">
          <button className="back-button" onClick={handleBack}>← Back</button>
          <div className="user-cards-section">
            {teams.find(t => t.key === selectedTeam).users.map(user => (
              <div
                key={user.userId}
                className="user-card"
                onClick={() => handleUserCardClick(user.userId)}
                style={{ cursor: 'pointer' }}
              >
                <h4>{user.display}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects view (unchanged) */}
      {activeSection === 'projects' && (
        <div className="expanded-view projects-view">
          <button className="back-button" onClick={handleBack}>← Back</button>
          <div className="top-cards-section">
            <div className="mini-card projects-mini">
              <h3>Projects</h3>
              <p>Prj</p>
            </div>
            <div className="mini-card teams-mini-in-projects">
              <h3>Teams</h3>
              <p>Tm</p>
            </div>
          </div>
          <div className="projects-grid">
            <div className="project-card" onClick={() => handleProjectClick('Website Project')} style={{ cursor: 'pointer' }}>
              <h4>Website Project</h4>
            </div>
            <div className="project-card" onClick={() => handleProjectClick('Software Project')} style={{ cursor: 'pointer' }}>
              <h4>Software Project</h4>
            </div>
            <div className="project-card" onClick={() => handleProjectClick('Dashboards')} style={{ cursor: 'pointer' }}>
              <h4>Dashboards</h4>
            </div>
            <div className="project-card" onClick={() => handleProjectClick('Graphic Design')} style={{ cursor: 'pointer' }}>
              <h4>Graphic Design</h4>
            </div>
            <div className="project-card" onClick={() => handleProjectClick('Resources')} style={{ cursor: 'pointer' }}>
              <h4>Resources</h4>
            </div>
            <div className="project-card" onClick={() => handleProjectClick('R&D')} style={{ cursor: 'pointer' }}>
              <h4>R&D</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
