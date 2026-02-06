import React, { useState, useEffect } from 'react';
import aiProviders, { PROVIDERS } from '../services/aiProviders';
import './AIProviderSettings.css';

const AIProviderSettings = ({ onClose, onSave }) => {
  const [config, setConfig] = useState(aiProviders.getConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [ollamaModels, setOllamaModels] = useState([]);
  const [showApiKey, setShowApiKey] = useState(false);

  // Fetch Ollama models if that provider is selected
  useEffect(() => {
    if (config.provider === 'ollama') {
      aiProviders.fetchOllamaModels().then(models => {
        if (models.length > 0) {
          setOllamaModels(models);
        }
      });
    }
  }, [config.provider]);

  const handleProviderChange = (providerId) => {
    const provider = PROVIDERS[providerId];
    setConfig({
      ...config,
      provider: providerId,
      model: provider?.defaultModel || '',
    });
    setTestResult(null);
  };

  const handleSave = () => {
    aiProviders.saveConfig(config);
    onSave?.(config);
    onClose?.();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    
    // Temporarily apply config for testing
    aiProviders.saveConfig(config);
    
    const result = await aiProviders.testConnection();
    setTestResult(result);
    setTesting(false);
  };

  const currentProvider = PROVIDERS[config.provider];
  const availableModels = config.provider === 'ollama' && ollamaModels.length > 0
    ? ollamaModels
    : currentProvider?.models || [];

  return (
    <div className="ai-provider-settings">
      <div className="settings-header">
        <h2>⚙️ AI Provider Settings</h2>
        <p className="settings-subtitle">Choose how LOA thinks</p>
      </div>

      <div className="providers-list">
        {Object.values(PROVIDERS).map(provider => (
          <div
            key={provider.id}
            className={`provider-card ${config.provider === provider.id ? 'selected' : ''}`}
            onClick={() => handleProviderChange(provider.id)}
          >
            <div className="provider-header">
              <div className="provider-radio">
                <input
                  type="radio"
                  checked={config.provider === provider.id}
                  onChange={() => handleProviderChange(provider.id)}
                />
              </div>
              <div className="provider-info">
                <h3>{provider.name}</h3>
                <p>{provider.description}</p>
              </div>
              {provider.isSovereign && (
                <span className="sovereign-badge">🔒 Sovereign</span>
              )}
            </div>

            {/* Privacy indicator */}
            <div className="privacy-meter">
              <span className="privacy-label">Privacy:</span>
              <div className="privacy-dots">
                {[1, 2, 3, 4, 5].map(level => (
                  <span
                    key={level}
                    className={`privacy-dot ${level <= provider.privacyLevel ? 'filled' : ''}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration for selected provider */}
      <div className="provider-config">
        <h3>Configuration</h3>

        {/* API Key (for providers that need it) */}
        {currentProvider?.requiresApiKey && (
          <div className="config-field">
            <label>API Key</label>
            <div className="api-key-input">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder={`Enter your ${currentProvider.name} API key`}
              />
              <button
                className="toggle-visibility"
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? '🙈' : '👁️'}
              </button>
            </div>
            {config.provider === 'claude' && (
              <p className="config-hint">
                Get your key at <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>
              </p>
            )}
            {config.provider === 'openai' && (
              <p className="config-hint">
                Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer">platform.openai.com</a>
              </p>
            )}
            {config.provider === 'venice' && (
              <p className="config-hint">
                Get your key at <a href="https://venice.ai" target="_blank" rel="noopener noreferrer">venice.ai</a> - Accepts Bitcoin!
              </p>
            )}
          </div>
        )}

        {/* Ollama-specific instructions */}
        {config.provider === 'ollama' && (
          <div className="config-field">
            <label>Ollama Endpoint</label>
            <input
              type="text"
              value={config.customEndpoint || 'http://localhost:11434/api/chat'}
              onChange={(e) => setConfig({ ...config, customEndpoint: e.target.value })}
              placeholder="http://localhost:11434/api/chat"
            />
            <p className="config-hint">
              Run <code>ollama serve</code> and <code>ollama pull llama3.1:8b</code> to get started.
              <br />
              <a href="https://ollama.com" target="_blank" rel="noopener noreferrer">Download Ollama</a>
            </p>
          </div>
        )}

        {/* Custom endpoint */}
        {config.provider === 'custom' && (
          <>
            <div className="config-field">
              <label>Endpoint URL</label>
              <input
                type="text"
                value={config.customEndpoint || ''}
                onChange={(e) => setConfig({ ...config, customEndpoint: e.target.value })}
                placeholder="https://your-api.com/v1/chat/completions"
              />
            </div>
            <div className="config-field">
              <label>Model Name</label>
              <input
                type="text"
                value={config.customModel || ''}
                onChange={(e) => setConfig({ ...config, customModel: e.target.value })}
                placeholder="model-name"
              />
            </div>
            <div className="config-field">
              <label>API Key (optional)</label>
              <input
                type="password"
                value={config.apiKey || ''}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder="Optional API key"
              />
            </div>
          </>
        )}

        {/* Model selection */}
        {availableModels.length > 0 && config.provider !== 'custom' && (
          <div className="config-field">
            <label>Model</label>
            <select
              value={config.model || currentProvider?.defaultModel}
              onChange={(e) => setConfig({ ...config, model: e.target.value })}
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Test connection */}
      <div className="test-connection">
        <button
          className={`test-btn ${testing ? 'testing' : ''}`}
          onClick={handleTest}
          disabled={testing}
        >
          {testing ? '🔄 Testing...' : '🔌 Test Connection'}
        </button>
        
        {testResult && (
          <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="settings-actions">
        <button className="cancel-btn" onClick={onClose}>
          Cancel
        </button>
        <button className="save-btn" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default AIProviderSettings;
