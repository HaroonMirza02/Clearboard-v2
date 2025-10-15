import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/TeamSelection.css';

export default function TeamSelection() {
  const navigate = useNavigate();

  const selectTeam = (team) => {
    try { localStorage.setItem('selectedTeam', team); } catch {};
  // Navigate to filelist (FileList login/signup UI)
  navigate('/filelist');
  };

  return (
    <div className="team-selection-page">
      <h2>Select Your Team</h2>
      <div className="team-cards">
        <button className="team-card" onClick={() => selectTeam('softdev')} aria-label="Select SoftDev Team">
          <h3>SoftDev Team</h3>
          <p>Access software development files and resources.</p>
        </button>
        <button className="team-card" onClick={() => selectTeam('busdev')} aria-label="Select BusDev Team">
          <h3>BusDev Team</h3>
          <p>Access business development files and resources.</p>
        </button>
        <button className="team-card" onClick={() => selectTeam('admin')} aria-label="Select Admin">
          <h3>Admin</h3>
          <p>Administrative access to all files.</p>
        </button>
      </div>
    </div>
  );
}
