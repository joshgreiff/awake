/**
 * AI Settings Component
 * 
 * Configure AI provider (Claude, OpenAI, Venice, Ollama)
 * Inspired by OpenClaw's provider selection
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Loader2, Shield, Zap, Server, Key, AlertCircle, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import aiService, { PROVIDERS, type ProviderId } from '../services/aiService';

interface AISettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISettings({ isOpen, onClose }: AISettingsProps) {
  const [selectedProvider, setSelectedProvider] = useState<ProviderId>('claude');
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [ollamaStatus, setOllamaStatus] = useState<{ running: boolean; models: string[] }>({ running: false, models: [] });
  const [isSaved, setIsSaved] = useState(false);

  // Load current config
  useEffect(() => {
    const config = aiService.getConfig();
    setSelectedProvider(config.provider);
    setApiKey(config.apiKey);
    setSelectedModel(config.model);
  }, [isOpen]);

  // Check Ollama status when selected
  useEffect(() => {
    if (selectedProvider === 'ollama') {
      checkOllama();
    }
  }, [selectedProvider]);

  const checkOllama = async () => {
    const status = await aiService.checkOllamaStatus();
    setOllamaStatus(status);
    if (status.running && status.models.length > 0 && !selectedModel) {
      setSelectedModel(status.models[0]);
    }
  };

  const handleProviderChange = (provider: ProviderId) => {
    setSelectedProvider(provider);
    setSelectedModel(PROVIDERS[provider].defaultModel);
    setTestResult(null);
  };

  const handleSave = () => {
    aiService.saveConfig({
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleTest = async () => {
    // Save first
    aiService.saveConfig({
      provider: selectedProvider,
      apiKey,
      model: selectedModel,
    });

    setIsTesting(true);
    setTestResult(null);

    const result = await aiService.testConnection();
    setTestResult(result);
    setIsTesting(false);
  };

  if (!isOpen) return null;

  const currentProvider = PROVIDERS[selectedProvider];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-gradient-to-br from-[#1a1025] to-[#0a0514] rounded-2xl border border-primary/20 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-primary/20">
          <div>
            <h2 className="text-lg font-semibold text-foreground">AI Settings</h2>
            <p className="text-xs text-muted-foreground">Configure your AI provider</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Provider Selection */}
          <div className="space-y-3">
            <Label>Select Provider</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(PROVIDERS).map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderChange(provider.id as ProviderId)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedProvider === provider.id
                      ? 'border-primary bg-primary/10'
                      : 'border-primary/20 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {provider.id === 'ollama' ? (
                      <Server className="w-4 h-4 text-primary" />
                    ) : (
                      <Key className="w-4 h-4 text-primary" />
                    )}
                    <span className="font-medium text-sm">{provider.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{provider.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <Shield className="w-3 h-3" />
                    <span className="text-[10px] text-muted-foreground">
                      Privacy: {'●'.repeat(provider.privacyLevel)}{'○'.repeat(5 - provider.privacyLevel)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ollama Status */}
          {selectedProvider === 'ollama' && (
            <div className={`p-3 rounded-lg border ${ollamaStatus.running ? 'border-green-500/30 bg-green-500/10' : 'border-yellow-500/30 bg-yellow-500/10'}`}>
              <div className="flex items-center gap-2">
                {ollamaStatus.running ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-400">Ollama is running</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-yellow-400">Ollama not detected</span>
                  </>
                )}
              </div>
              {!ollamaStatus.running && (
                <div className="mt-2 text-xs text-muted-foreground space-y-2">
                  <p>Ollama not detected. This could mean:</p>
                  <ul className="list-disc list-inside space-y-1 opacity-80">
                    <li>Ollama isn't running</li>
                    <li>CORS is blocking the connection (if using from a website)</li>
                  </ul>
                  <div className="mt-2 p-2 rounded bg-background/50 font-mono text-[10px] break-all">
                    <p className="opacity-60 mb-1">Fix CORS by running:</p>
                    OLLAMA_ORIGINS="https://www.awakeapp.space,http://localhost:*" ollama serve
                  </div>
                  <a 
                    href="https://ollama.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    Get Ollama <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
              {ollamaStatus.running && ollamaStatus.models.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available: {ollamaStatus.models.slice(0, 3).join(', ')}
                  {ollamaStatus.models.length > 3 && ` +${ollamaStatus.models.length - 3} more`}
                </p>
              )}
            </div>
          )}

          {/* API Key Input */}
          {currentProvider.requiresApiKey && (
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={`Enter your ${currentProvider.name} API key`}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                {selectedProvider === 'claude' && (
                  <>Get your key at <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">console.anthropic.com</a></>
                )}
                {selectedProvider === 'openai' && (
                  <>Get your key at <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.openai.com</a></>
                )}
                {selectedProvider === 'venice' && (
                  <>Get your key at <a href="https://venice.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">venice.ai</a></>
                )}
              </p>
            </div>
          )}

          {/* Model Selection */}
          <div className="space-y-2">
            <Label>Model</Label>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              className="w-full bg-background/50 border border-primary/20 rounded-lg px-3 py-2 text-sm text-foreground"
            >
              {selectedProvider === 'ollama' && ollamaStatus.models.length > 0
                ? ollamaStatus.models.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))
                : currentProvider.models.map(model => (
                    <option key={model.id} value={model.id}>{model.name}</option>
                  ))
              }
            </select>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-lg border ${testResult.success ? 'border-green-500/30 bg-green-500/10' : 'border-red-500/30 bg-red-500/10'}`}>
              <div className="flex items-center gap-2">
                {testResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-400">Connection successful!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm text-red-400">Connection failed</span>
                  </>
                )}
              </div>
              {!testResult.success && (
                <p className="text-xs text-muted-foreground mt-1">{testResult.message}</p>
              )}
            </div>
          )}

          {/* Saved notification */}
          {isSaved && (
            <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-400">Settings saved!</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-primary/20">
          <Button variant="outline" onClick={handleTest} disabled={isTesting}>
            {isTesting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Test Connection
              </>
            )}
          </Button>
          <Button onClick={handleSave}>
            <Check className="w-4 h-4 mr-2" />
            Save
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
