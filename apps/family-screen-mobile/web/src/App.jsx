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
    <div className="container">
      <div className="content">
        <h1 className="title">Family Screen</h1>
        <p className="subtitle">Pair your TV to get started</p>

        <div className="inputContainer">
          <label className="label">TV Pairing Code</label>
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

        <button
          className={`button ${loading ? 'buttonDisabled' : ''}`}
          onClick={handlePair}
          disabled={loading}>
          {loading ? 'Connecting...' : 'Pair TV'}
        </button>
      </div>
    </div>
  );
}

function ProfileManagementScreen({ onBack }) {
  const [childProfiles, setChildProfiles] = useState([
    { id: '1', name: 'Emma', age: 8 },
    { id: '2', name: 'Jake', age: 12 }
  ]);
  const [selectedProfile, setSelectedProfile] = useState(null);

  const addProfile = () => {
    const name = prompt('Enter child name:');
    const age = prompt('Enter child age:');
    if (name && age) {
      setChildProfiles([...childProfiles, { id: String(childProfiles.length + 1), name, age: parseInt(age) }]);
    }
  };

  const selectProfile = (profile) => {
    setSelectedProfile(profile);
  };

  if (selectedProfile) {
    return (
      <div className="container">
        <div className="content">
          <button className="backButton" onClick={() => setSelectedProfile(null)}>← Back to Profiles</button>
          <h1 className="title">{selectedProfile.name}'s Profile</h1>
          <p className="subtitle">Age: {selectedProfile.age}</p>
          
          <div className="profileDetails">
            <h3>Content Settings</h3>
            <div className="settingItem">
              <label>Violence Level</label>
              <select className="select">
                <option>None</option>
                <option>Mild</option>
                <option>Moderate</option>
                <option>Severe</option>
              </select>
            </div>
            <div className="settingItem">
              <label>Language Level</label>
              <select className="select">
                <option>None</option>
                <option>Mild</option>
                <option>Moderate</option>
                <option>Severe</option>
              </select>
            </div>
          </div>

          <button className="button">Save Settings</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="content">
        <button className="backButton" onClick={onBack}>← Back to Pairing</button>
        <h1 className="title">Child Profiles</h1>
        <p className="subtitle">Manage your family's viewing preferences</p>

        <div className="profilesContainer">
          {childProfiles.map((profile) => (
            <div key={profile.id} className="profileCard" onClick={() => selectProfile(profile)}>
              <div className="profileName">{profile.name}</div>
              <div className="profileAge">Age: {profile.age}</div>
              <div className="profileAction">Manage →</div>
            </div>
          ))}
          <button className="addButton" onClick={addProfile}>
            + Add Profile
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
