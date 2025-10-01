import React, { useState } from 'react';
import './SimpleAuthModal.css';

const SimpleAuthModal = ({ onAuthSuccess }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    onAuthSuccess(username.trim());
  };

  return (
    <div className="simple-auth-modal">
      <div className="auth-backdrop" />
      <div className="auth-content">
        <div className="auth-header">
          <h1>🌟 Welcome to Awake</h1>
          <p>Your personal growth companion</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">What should we call you?</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter your name"
              autoFocus
              maxLength={50}
            />
            {error && <div className="error-message">{error}</div>}
          </div>

          <button type="submit" className="auth-btn">
            Get Started
          </button>

          <div className="auth-note">
            <small>
              💡 Your data is stored locally on this device. 
              No account required, no passwords to remember.
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleAuthModal; 