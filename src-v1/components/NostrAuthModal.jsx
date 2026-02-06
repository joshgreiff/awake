import React, { useState } from 'react';
import nostrAuth from '../services/nostrAuth';
import './NostrAuthModal.css';

const NostrAuthModal = ({ onAuthSuccess, onClose }) => {
  const [step, setStep] = useState('welcome'); // welcome, create, import, backup
  const [displayName, setDisplayName] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [newKeys, setNewKeys] = useState(null);

  const handleCreateIdentity = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await nostrAuth.createIdentity(displayName || 'Awake User');
      if (success) {
        const userInfo = nostrAuth.getUserInfo();
        setNewKeys({
          publicKey: userInfo.npub,
          privateKey: nostrAuth.getPrivateKey('nsec')
        });
        setStep('backup');
      } else {
        setError('Failed to create identity. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while creating your identity.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportIdentity = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const success = await nostrAuth.importIdentity(privateKeyInput.trim());
      if (success) {
        onAuthSuccess();
      } else {
        setError('Invalid private key. Please check and try again.');
      }
    } catch (err) {
      setError('Failed to import identity. Please check your private key format.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupComplete = () => {
    onAuthSuccess();
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const renderWelcomeStep = () => (
    <div className="auth-step">
      <div className="auth-header">
        <h2>🔐 Own Your Identity & Data</h2>
        <p>Awake uses Nostr keys for true privacy and data ownership</p>
      </div>
      
      <div className="auth-benefits">
        <div className="benefit-item">
          <span className="benefit-icon">🛡️</span>
          <div>
            <strong>Ultimate Privacy</strong>
            <p>Your data never leaves your device</p>
          </div>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🔑</span>
          <div>
            <strong>True Ownership</strong>
            <p>You control your identity and data</p>
          </div>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">📱</span>
          <div>
            <strong>Portable</strong>
            <p>Use your identity across devices and apps</p>
          </div>
        </div>
        <div className="benefit-item">
          <span className="benefit-icon">🚫</span>
          <div>
            <strong>No Vendor Lock-in</strong>
            <p>Export your data anytime</p>
          </div>
        </div>
      </div>

      <div className="auth-actions">
        <button 
          className="auth-btn primary"
          onClick={() => setStep('create')}
        >
          Create New Identity
        </button>
        <button 
          className="auth-btn secondary"
          onClick={() => setStep('import')}
        >
          Import Existing Keys
        </button>
      </div>

      <div className="auth-learn-more">
        <details>
          <summary>What are Nostr keys?</summary>
          <div className="learn-more-content">
            <p>Nostr keys are a cryptographic key pair (public and private) that serve as your digital identity:</p>
            <ul>
              <li><strong>Public key:</strong> Your unique identifier (like a username)</li>
              <li><strong>Private key:</strong> Your secret key (like a password)</li>
            </ul>
            <p>Unlike traditional accounts, YOU own these keys, not us. This means ultimate privacy and control.</p>
          </div>
        </details>
      </div>
    </div>
  );

  const renderCreateStep = () => (
    <div className="auth-step">
      <div className="auth-header">
        <h2>✨ Create Your Identity</h2>
        <p>Generate a new Nostr identity for Awake</p>
      </div>

      <div className="auth-form">
        <label>
          Display Name (optional)
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How should we address you?"
            maxLength={50}
          />
        </label>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button 
            className="auth-btn primary"
            onClick={handleCreateIdentity}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate Keys'}
          </button>
          <button 
            className="auth-btn secondary"
            onClick={() => setStep('welcome')}
            disabled={isLoading}
          >
            Back
          </button>
        </div>
      </div>

      <div className="auth-security-note">
        <p>🔒 Your keys will be generated securely in your browser and stored locally.</p>
      </div>
    </div>
  );

  const renderImportStep = () => (
    <div className="auth-step">
      <div className="auth-header">
        <h2>📥 Import Your Identity</h2>
        <p>Use your existing Nostr private key</p>
      </div>

      <div className="auth-form">
        <label>
          Private Key
          <textarea
            value={privateKeyInput}
            onChange={(e) => setPrivateKeyInput(e.target.value)}
            placeholder="Paste your private key here (nsec... or hex format)"
            rows={3}
          />
        </label>

        <div className="key-format-help">
          <p>Supported formats:</p>
          <ul>
            <li><code>nsec1...</code> (Bech32 format)</li>
            <li><code>64-character hex string</code></li>
          </ul>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <div className="auth-actions">
          <button 
            className="auth-btn primary"
            onClick={handleImportIdentity}
            disabled={isLoading || !privateKeyInput.trim()}
          >
            {isLoading ? 'Importing...' : 'Import Identity'}
          </button>
          <button 
            className="auth-btn secondary"
            onClick={() => setStep('welcome')}
            disabled={isLoading}
          >
            Back
          </button>
        </div>
      </div>

      <div className="auth-security-note">
        <p>🔒 Your private key is processed locally and never sent to our servers.</p>
      </div>
    </div>
  );

  const renderBackupStep = () => (
    <div className="auth-step">
      <div className="auth-header">
        <h2>💾 Backup Your Keys</h2>
        <p>Save these keys safely - they're your only way to recover your account!</p>
      </div>

      <div className="key-backup-section">
        <div className="key-item">
          <label>Public Key (your identity)</label>
          <div className="key-display">
            <code>{newKeys?.publicKey}</code>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(newKeys?.publicKey)}
            >
              📋
            </button>
          </div>
        </div>

        <div className="key-item critical">
          <label>Private Key (keep secret!)</label>
          <div className="key-display">
            <code>{newKeys?.privateKey}</code>
            <button 
              className="copy-btn"
              onClick={() => copyToClipboard(newKeys?.privateKey)}
            >
              📋
            </button>
          </div>
        </div>
      </div>

      <div className="backup-warning">
        <h3>⚠️ Important Security Notes:</h3>
        <ul>
          <li>Your <strong>private key</strong> is like your master password</li>
          <li>Anyone with your private key can access your account</li>
          <li>We cannot recover your keys if you lose them</li>
          <li>Store them in a password manager or secure location</li>
        </ul>
      </div>

      <div className="auth-actions">
        <button 
          className="auth-btn primary"
          onClick={handleBackupComplete}
        >
          I've Saved My Keys Safely
        </button>
      </div>
    </div>
  );

  return (
    <div className="auth-modal-backdrop">
      <div className="auth-modal">
        <button 
          className="auth-close-btn"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        {step === 'welcome' && renderWelcomeStep()}
        {step === 'create' && renderCreateStep()}
        {step === 'import' && renderImportStep()}
        {step === 'backup' && renderBackupStep()}
      </div>
    </div>
  );
};

export default NostrAuthModal; 