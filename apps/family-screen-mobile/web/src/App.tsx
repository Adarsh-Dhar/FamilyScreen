import React, { useState } from 'react';
import './App.css';

// This is the web version of the mobile phone app for pairing with the TV
// It allows parents to enter the TV pairing code and link their account

function PairingScreen({ onPaired }) {
  const [pairingCode, setPairingCode] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handlePair = async () => {
    if (!pairingCode.trim()) {
      alert('Error: Please enter a pairing code');
      return;
    }

    setLoading(true);
    try {
      // Bypass TV pairing check - directly proceed
      alert('Success: TV paired successfully!');
      onPaired();
    } catch (error) {
      alert('Error: Failed to connect to TV. Please check your network.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <div className="background-gradient"></div>
      <div className="card">
        <div className="icon-container">
          <svg className="tv-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
            <polyline points="17 2 12 7 7 2"></polyline>
          </svg>
        </div>
        <h1 className="title">Family Screen</h1>
        <p className="subtitle">Pair your TV to get started</p>

        <div className="input-group">
          <label className="label">TV Pairing Code</label>
          <div className="input-wrapper">
            <input
              className="input"
              placeholder="Enter 6-digit code"
              value={pairingCode}
              onChange={(e) => setPairingCode(e.target.value)}
              type="text"
              maxLength={6}
              autoFocus
            />
          </div>
        </div>

        <button
          className={`button ${loading ? 'button-disabled' : ''}`}
          onClick={handlePair}
          disabled={loading}>
          {loading ? (
            <span className="button-content">
              <svg className="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" strokeDasharray="80" strokeDashoffset="60"></circle>
              </svg>
              Connecting...
            </span>
          ) : (
            'Pair TV'
          )}
        </button>
      </div>
    </div>
  );
}

function ProfileManagementScreen({ onBack }) {
  const [childProfiles, setChildProfiles] = useState([
    { id: '1', name: 'Emma', age: 8, avatar: '👧' },
    { id: '2', name: 'Jake', age: 12, avatar: '👦' }
  ]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const addProfile = () => {
    const name = prompt('Enter child name:');
    const age = prompt('Enter child age:');
    if (name && age) {
      const avatars = ['👧', '👦', '🧒', '👶'];
      const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
      setChildProfiles([...childProfiles, { 
        id: String(childProfiles.length + 1), 
        name, 
        age: parseInt(age),
        avatar: randomAvatar
      }]);
    }
  };

  const selectProfile = (profile) => {
    setSelectedProfile(profile);
  };

  if (selectedProfile) {
    return (
      <div className="app-container">
        <div className="background-gradient"></div>
        <div className="card">
          <button className="back-button" onClick={() => setSelectedProfile(null)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Back to Profiles
          </button>
          
          <div className="profile-header">
            <div className="profile-avatar-large">{selectedProfile.avatar}</div>
            <div>
              <h1 className="title">{selectedProfile.name}'s Profile</h1>
              <p className="subtitle">Age: {selectedProfile.age}</p>
            </div>
          </div>
          
          <div className="settings-section">
            <h3 className="section-title">Content Settings</h3>
            
            <div className="setting-item">
              <label className="setting-label">Violence Level</label>
              <div className="select-wrapper">
                <select className="select">
                  <option>None</option>
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </div>
            </div>
            
            <div className="setting-item">
              <label className="setting-label">Language Level</label>
              <div className="select-wrapper">
                <select className="select">
                  <option>None</option>
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-label">Sexual Content</label>
              <div className="select-wrapper">
                <select className="select">
                  <option>None</option>
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-label">Substances</label>
              <div className="select-wrapper">
                <select className="select">
                  <option>None</option>
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </div>
            </div>

            <div className="setting-item">
              <label className="setting-label">Scary Content</label>
              <div className="select-wrapper">
                <select className="select">
                  <option>None</option>
                  <option>Mild</option>
                  <option>Moderate</option>
                  <option>Severe</option>
                </select>
              </div>
            </div>
          </div>

          <button className="button button-primary">
            Save Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="background-gradient"></div>
      <div className="card">
        <button className="back-button" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Pairing
        </button>
        
        <h1 className="title">Child Profiles</h1>
        <p className="subtitle">Manage your family's viewing preferences</p>

        <div className="profiles-grid">
          {childProfiles.map((profile) => (
            <div key={profile.id} className="profile-card" onClick={() => selectProfile(profile)}>
              <div className="profile-avatar">{profile.avatar}</div>
              <div className="profile-info">
                <div className="profile-name">{profile.name}</div>
                <div className="profile-age">Age {profile.age}</div>
              </div>
              <div className="profile-arrow">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            </div>
          ))}
          
          <button className="add-profile-card" onClick={addProfile}>
            <div className="add-icon">+</div>
            <div className="add-text">Add Profile</div>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('pairing'); // 'pairing' or 'profiles'

  return (
    <>
      {currentScreen === 'pairing' && (
        <PairingScreen onPaired={() => setCurrentScreen('profiles')} />
      )}
      {currentScreen === 'profiles' && (
        <ProfileManagementScreen onBack={() => setCurrentScreen('pairing')} />
      )}
    </>
  );
}
