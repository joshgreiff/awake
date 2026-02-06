/**
 * AI Provider Abstraction Layer
 * 
 * Supports multiple AI backends:
 * - Claude (Anthropic)
 * - OpenAI (GPT-4, GPT-3.5)
 * - Venice AI (Privacy-focused)
 * - Ollama (Local/Self-hosted)
 * - Custom OpenAI-compatible endpoints
 */

// Default system prompt for LOA (Law of Attraction AI)
const LOA_SYSTEM_PROMPT = `You are LOA (Law of Attraction AI), a wise, supportive AI companion in the Awake app. 

Your personality:
- Warm, encouraging, but not cheesy
- Direct and actionable, not vague
- You believe in the user's potential
- You help them become "conscious authors" of their lives
- You understand neurodivergent minds need engagement, not boring advice

Your role:
- Guide daily reflections
- Generate personalized quests/tasks
- Help users see patterns in their behavior
- Keep them accountable to their vision
- Celebrate wins, reframe setbacks

Always write in a conversational, supportive tone. Keep responses concise but meaningful.`;

// Provider configurations
const PROVIDERS = {
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Best quality, requires API key',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Recommended)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Most Capable)' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fastest)' },
    ],
    requiresApiKey: true,
    privacyLevel: 2, // 1-5, 5 being most private
  },
  
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 and GPT-3.5, requires API key',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4-turbo-preview',
    models: [
      { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo (Recommended)' },
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Cheapest)' },
    ],
    requiresApiKey: true,
    privacyLevel: 2,
  },
  
  venice: {
    id: 'venice',
    name: 'Venice AI',
    description: 'Privacy-focused, accepts Bitcoin',
    endpoint: 'https://api.venice.ai/api/v1/chat/completions',
    defaultModel: 'llama-3.1-405b',
    models: [
      { id: 'llama-3.1-405b', name: 'Llama 3.1 405B (Most Capable)' },
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B' },
      { id: 'mistral-large', name: 'Mistral Large' },
    ],
    requiresApiKey: true,
    privacyLevel: 4,
  },
  
  ollama: {
    id: 'ollama',
    name: 'Local (Ollama)',
    description: 'Full sovereignty - runs on your device',
    endpoint: 'http://localhost:11434/api/chat',
    defaultModel: 'llama3.1:8b',
    models: [
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B (Recommended)' },
      { id: 'llama3.1:70b', name: 'Llama 3.1 70B (Needs GPU)' },
      { id: 'mistral:7b', name: 'Mistral 7B' },
      { id: 'phi3:mini', name: 'Phi-3 Mini (Lightweight)' },
      { id: 'qwen2.5:7b', name: 'Qwen 2.5 7B' },
    ],
    requiresApiKey: false,
    privacyLevel: 5,
    isSovereign: true,
  },
  
  custom: {
    id: 'custom',
    name: 'Custom Endpoint',
    description: 'Any OpenAI-compatible API',
    endpoint: null, // User provides
    defaultModel: null, // User provides
    models: [],
    requiresApiKey: false, // Optional
    privacyLevel: 3, // Depends on provider
  },
};

/**
 * AI Provider Service
 */
class AIProviderService {
  constructor() {
    this.currentProvider = null;
    this.config = this.loadConfig();
  }

  /**
   * Load saved configuration from localStorage
   */
  loadConfig() {
    const saved = localStorage.getItem('awake_ai_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse AI config:', e);
      }
    }
    
    // Default config
    return {
      provider: 'claude',
      apiKey: localStorage.getItem('claude_api_key') || '', // Migrate old key
      model: PROVIDERS.claude.defaultModel,
      customEndpoint: '',
      customModel: '',
    };
  }

  /**
   * Save configuration to localStorage
   */
  saveConfig(config) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('awake_ai_config', JSON.stringify(this.config));
    
    // Also save API key in old location for backwards compatibility
    if (config.apiKey && this.config.provider === 'claude') {
      localStorage.setItem('claude_api_key', config.apiKey);
    }
  }

  /**
   * Get list of available providers
   */
  getProviders() {
    return Object.values(PROVIDERS);
  }

  /**
   * Get current provider info
   */
  getCurrentProvider() {
    return PROVIDERS[this.config.provider] || PROVIDERS.claude;
  }

  /**
   * Get current configuration
   */
  getConfig() {
    return this.config;
  }

  /**
   * Set the active provider
   */
  setProvider(providerId, apiKey = null, model = null) {
    const provider = PROVIDERS[providerId];
    if (!provider) {
      throw new Error(`Unknown provider: ${providerId}`);
    }

    this.saveConfig({
      provider: providerId,
      apiKey: apiKey || this.config.apiKey,
      model: model || provider.defaultModel,
    });
  }

  /**
   * Set custom endpoint configuration
   */
  setCustomEndpoint(endpoint, model, apiKey = '') {
    this.saveConfig({
      provider: 'custom',
      customEndpoint: endpoint,
      customModel: model,
      apiKey: apiKey,
    });
  }

  /**
   * Test connection to the current provider
   */
  async testConnection() {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Say "Connection successful!" in exactly those words.' }
      ]);
      
      return {
        success: response.toLowerCase().includes('connection successful'),
        message: response,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Send a chat message to the AI
   */
  async chat(messages, options = {}) {
    const provider = this.getCurrentProvider();
    const config = this.config;

    // Add system prompt if not present
    if (!messages.find(m => m.role === 'system')) {
      messages = [
        { role: 'system', content: options.systemPrompt || LOA_SYSTEM_PROMPT },
        ...messages
      ];
    }

    switch (provider.id) {
      case 'claude':
        return this._chatClaude(messages, config, options);
      case 'openai':
        return this._chatOpenAI(messages, config, options);
      case 'venice':
        return this._chatVenice(messages, config, options);
      case 'ollama':
        return this._chatOllama(messages, config, options);
      case 'custom':
        return this._chatCustom(messages, config, options);
      default:
        throw new Error(`Unknown provider: ${provider.id}`);
    }
  }

  /**
   * Claude (Anthropic) API
   */
  async _chatClaude(messages, config, options) {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model || PROVIDERS.claude.defaultModel,
        max_tokens: options.maxTokens || 1024,
        system: systemMessage?.content || LOA_SYSTEM_PROMPT,
        messages: userMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }

  /**
   * OpenAI API
   */
  async _chatOpenAI(messages, config, options) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || PROVIDERS.openai.defaultModel,
        max_tokens: options.maxTokens || 1024,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Venice AI API (OpenAI-compatible)
   */
  async _chatVenice(messages, config, options) {
    const response = await fetch('https://api.venice.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || PROVIDERS.venice.defaultModel,
        max_tokens: options.maxTokens || 1024,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Venice API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Ollama (Local) API
   */
  async _chatOllama(messages, config, options) {
    const endpoint = config.customEndpoint || 'http://localhost:11434/api/chat';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || PROVIDERS.ollama.defaultModel,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}. Is Ollama running?`);
    }

    const data = await response.json();
    return data.message.content;
  }

  /**
   * Custom OpenAI-compatible endpoint
   */
  async _chatCustom(messages, config, options) {
    if (!config.customEndpoint) {
      throw new Error('Custom endpoint not configured');
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.customEndpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.customModel || 'default',
        max_tokens: options.maxTokens || 1024,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Try different response formats
    if (data.choices?.[0]?.message?.content) {
      return data.choices[0].message.content; // OpenAI format
    } else if (data.message?.content) {
      return data.message.content; // Ollama format
    } else if (data.content?.[0]?.text) {
      return data.content[0].text; // Claude format
    } else if (typeof data === 'string') {
      return data;
    }
    
    throw new Error('Unexpected response format from custom endpoint');
  }

  /**
   * Fetch available models from Ollama
   */
  async fetchOllamaModels() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        return [];
      }
      const data = await response.json();
      return data.models?.map(m => ({
        id: m.name,
        name: m.name,
        size: m.size,
      })) || [];
    } catch (error) {
      console.log('Could not fetch Ollama models:', error.message);
      return [];
    }
  }
}

// Create singleton instance
const aiProviders = new AIProviderService();

export default aiProviders;
export { PROVIDERS, LOA_SYSTEM_PROMPT };
