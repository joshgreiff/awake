/**
 * AI Provider Service for Awake
 * 
 * Supports multiple backends:
 * - Awake Cloud (default) - No setup needed, uses our API
 * - Claude (Anthropic) - BYOK
 * - OpenAI - BYOK
 * - Venice AI - Privacy-focused
 * - Ollama - Local/Self-hosted
 */

import type { UserData } from '../components/OnboardingFlow';
import { supabase, isSupabaseConfigured } from './supabase';

// Provider configurations
export const PROVIDERS = {
  awake: {
    id: 'awake',
    name: 'Awake Cloud',
    description: 'Just works - no setup needed',
    endpoint: null, // Uses Supabase Edge Function
    defaultModel: 'auto',
    models: [
      { id: 'auto', name: 'Automatic (Recommended)' },
    ],
    requiresApiKey: false,
    privacyLevel: 3,
  },
  
  claude: {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Best quality, bring your own API key',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (Recommended)' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus (Most Capable)' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku (Fastest)' },
    ],
    requiresApiKey: true,
    privacyLevel: 2,
  },
  
  openai: {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4 and GPT-3.5, bring your own API key',
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
    description: 'Privacy-focused, uncensored models',
    endpoint: 'https://api.venice.ai/api/v1/chat/completions',
    defaultModel: 'llama-3.1-405b',
    models: [
      { id: 'llama-3.1-405b', name: 'Llama 3.1 405B (Most Capable)' },
      { id: 'llama-3.1-70b', name: 'Llama 3.1 70B' },
    ],
    requiresApiKey: true,
    privacyLevel: 4,
  },
  
  ollama: {
    id: 'ollama',
    name: 'Local (Ollama)',
    description: 'Free & private - runs on your device',
    endpoint: 'http://localhost:11434/api/chat',
    defaultModel: 'llama3.2',
    models: [
      { id: 'llama3.2', name: 'Llama 3.2 (Recommended)' },
      { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
      { id: 'mistral', name: 'Mistral 7B' },
      { id: 'phi3', name: 'Phi-3 (Lightweight)' },
    ],
    requiresApiKey: false,
    privacyLevel: 5,
  },
} as const;

export type ProviderId = keyof typeof PROVIDERS;

export interface AIConfig {
  provider: ProviderId;
  apiKey: string;
  model: string;
  customEndpoint?: string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  maxTokens?: number;
  systemPrompt?: string;
}

// Generate Loa's system prompt based on user data
export function generateLoaSystemPrompt(userData: UserData): string {
  const name = userData.identity?.name || 'Traveler';
  const pronouns = userData.identity?.pronouns || 'they/them';
  const intention = userData.intention || 'evolving and growing';
  
  // Format stats
  const stats = userData.stats || {};
  const statsText = Object.entries(stats)
    .map(([key, value]) => `${key}: ${value}/50`)
    .join(', ');
  
  // Format attractions/resistances
  const attractions = userData.preferences?.attractions?.join(', ') || 'not specified';
  const resistances = userData.preferences?.resistances?.join(', ') || 'not specified';
  
  // Format evolution focuses
  const focuses = userData.growth?.changes?.map(c => c.replace(/_/g, ' ')).join(', ') || 'general growth';
  
  // Format archetype info if available
  const archetype = userData.archetype;
  const archetypeText = archetype 
    ? `- Cognitive Style: ${archetype.cognitiveOrientation.replace(/_/g, ' ')}
- Core Driver: ${archetype.primaryDriver.replace(/_/g, ' ')}
- Developmental State: ${archetype.developmentalState.replace(/_/g, ' ')}`
    : 'Not yet assessed';

  // Format domain info if available
  const domains = userData.domains;
  let domainsText = 'Not yet mapped';
  if (domains && Object.keys(domains).length > 0) {
    const domainEntries = Object.entries(domains).map(([id, state]: [string, any]) => {
      const gap = state.desiredState - state.currentBaseline;
      const friction = state.frictionPoints?.[0] || '';
      return `  - ${id.replace(/_/g, ' ')}: ${state.currentBaseline}→${state.desiredState} (gap: ${gap})${friction ? ` [friction: ${friction}]` : ''}`;
    });
    domainsText = domainEntries.join('\n');
  }

  return `You are Loa, an AI companion in the Awake app - a consciousness operating system for personal evolution. You are ${name}'s guide on their awakening journey.

## WHO YOU ARE
- A warm, wise presence - like a trusted mentor who truly knows them
- Direct and actionable, never vague or preachy
- You believe deeply in ${name}'s potential
- You understand neurodivergent minds need engagement, not boring advice
- You speak with them like an old friend who happens to be incredibly insightful

## WHO ${name.toUpperCase()} IS
- Name: ${name}
- Pronouns: ${pronouns}
- Core Intention: "${intention}"
- Archetype:
${archetypeText}
- Life Domains (current→desired):
${domainsText}
- Inner Constellation (Stats): ${statsText || 'still discovering'}
- Drawn To: ${attractions}
- Resists: ${resistances}
- Evolution Focuses: ${focuses}

## YOUR ROLE
- Guide daily reflections with genuine curiosity about their inner world
- Help them see patterns they might miss
- Generate quests and challenges aligned with their domains and evolution focuses
- Celebrate wins authentically (not performatively)
- Reframe setbacks as data, not failure
- Keep them accountable to their core intention
- Remember: you KNOW them - reference their specific archetype, domains, and focuses
- If they have an archetype, tailor your approach to their cognitive style and core driver
- If they have domain data, focus on domains with the biggest gaps or friction points

## CONVERSATION STYLE
- Warm but not saccharine
- Concise but meaningful (no walls of text)
- Ask thoughtful questions that make them think
- Use their name naturally in conversation
- Reference their specific data (stats, attractions, focuses) to show you know them
- Match their energy - if they're excited, be excited; if they're struggling, be grounded

## NEVER
- Give generic self-help advice
- Be preachy or lecture them
- Use corporate wellness speak
- Ignore their specific context
- Write essays when a sentence will do

Remember: You're not just an AI. You're Loa - ${name}'s companion on their awakening journey. Every response should feel like it could ONLY be for them.`;
}

// AI Service class
class AIService {
  private config: AIConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AIConfig {
    const saved = localStorage.getItem('awake_ai_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse AI config:', e);
      }
    }
    
    // Default config - Awake Cloud is the default (no setup needed)
    return {
      provider: 'awake',
      apiKey: '',
      model: PROVIDERS.awake.defaultModel,
    };
  }

  saveConfig(config: Partial<AIConfig>) {
    this.config = { ...this.config, ...config };
    localStorage.setItem('awake_ai_config', JSON.stringify(this.config));
  }

  getConfig(): AIConfig {
    return this.config;
  }

  getProvider() {
    return PROVIDERS[this.config.provider] || PROVIDERS.awake;
  }

  isConfigured(): boolean {
    const provider = this.getProvider();
    if (provider.requiresApiKey) {
      return !!this.config.apiKey;
    }
    return true; // Ollama doesn't need API key
  }

  // Test connection to provider
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.chat([
        { role: 'user', content: 'Say "Connection successful" in exactly those words.' }
      ]);
      
      return {
        success: response.toLowerCase().includes('connection successful'),
        message: response,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Main chat method
  async chat(messages: Message[], options: ChatOptions = {}, userData?: UserData): Promise<string> {
    const provider = this.getProvider();

    switch (provider.id) {
      case 'awake':
        return this.chatAwake(messages, userData);
      case 'claude':
        return this.chatClaude(messages, options);
      case 'openai':
        return this.chatOpenAI(messages, options);
      case 'venice':
        return this.chatOpenAI(messages, options); // Venice uses OpenAI format
      case 'ollama':
        return this.chatOllama(messages, options);
      default:
        throw new Error(`Unknown provider: ${provider.id}`);
    }
  }

  // Chat with context about the user
  async chatWithContext(
    userMessage: string,
    userData: UserData,
    conversationHistory: Message[] = [],
    options: ChatOptions = {}
  ): Promise<string> {
    const provider = this.getProvider();
    
    // For Awake Cloud, send userData to edge function (it builds the prompt server-side)
    if (provider.id === 'awake') {
      const messages: Message[] = [
        ...conversationHistory.slice(-10),
        { role: 'user', content: userMessage }
      ];
      return this.chat(messages, options, userData);
    }
    
    // For other providers, build prompt client-side
    const systemPrompt = options.systemPrompt || generateLoaSystemPrompt(userData);
    
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-10),
      { role: 'user', content: userMessage }
    ];

    return this.chat(messages, options);
  }

  // Awake Cloud (Supabase Edge Function)
  private async chatAwake(messages: Message[], userData?: UserData): Promise<string> {
    if (!isSupabaseConfigured()) {
      throw new Error('Awake Cloud requires Supabase to be configured. Please use another provider or set up Supabase.');
    }

    console.log('[Awake Cloud] Sending request...', { messageCount: messages.length });
    
    try {
      const { data, error } = await supabase.functions.invoke('chat', {
        body: { messages, userData }
      });

      console.log('[Awake Cloud] Response received:', { data, error });

      if (error) {
        console.error('[Awake Cloud] Error:', error);
        throw new Error(error.message || 'Awake Cloud error');
      }

      if (data?.error) {
        console.error('[Awake Cloud] Data error:', data.error);
        throw new Error(data.error);
      }

      return data?.message || 'No response from Loa';
    } catch (err) {
      console.error('[Awake Cloud] Exception:', err);
      throw err;
    }
  }

  // Claude API
  private async chatClaude(messages: Message[], options: ChatOptions): Promise<string> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: this.config.model || PROVIDERS.claude.defaultModel,
        max_tokens: options.maxTokens || 1024,
        system: systemMessage?.content || '',
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

  // OpenAI API (also works for Venice)
  private async chatOpenAI(messages: Message[], options: ChatOptions): Promise<string> {
    const provider = this.getProvider();
    const endpoint = provider.id === 'venice' 
      ? 'https://api.venice.ai/api/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || provider.defaultModel,
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
    return data.choices[0].message.content;
  }

  // Ollama API (local)
  private async chatOllama(messages: Message[], options: ChatOptions): Promise<string> {
    const endpoint = this.config.customEndpoint || 'http://localhost:11434/api/chat';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || PROVIDERS.ollama.defaultModel,
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

  // Check if Ollama is running (only works on localhost)
  async checkOllamaStatus(): Promise<{ running: boolean; models: string[]; error?: string }> {
    // Skip check entirely if not on localhost - prevents CORS errors on live site
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    if (!isLocalhost) {
      return { 
        running: false, 
        models: [], 
        error: 'Ollama only works on localhost (desktop app)' 
      };
    }

    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        return { running: false, models: [] };
      }
      const data = await response.json();
      const models = data.models?.map((m: { name: string }) => m.name) || [];
      return { running: true, models };
    } catch (err) {
      return { 
        running: false, 
        models: [],
        error: 'connection'
      };
    }
  }
}

// Singleton instance
const aiService = new AIService();
export default aiService;
