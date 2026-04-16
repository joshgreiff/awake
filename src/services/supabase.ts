/**
 * Supabase Client Configuration
 * 
 * Handles:
 * - User authentication (email, Google)
 * - Data persistence and sync
 * - Real-time updates
 */

import { createClient } from '@supabase/supabase-js';
import type { UserData } from '../components/OnboardingFlow';

// These will be replaced with your actual Supabase credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Types for our database
export interface UserProfile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
  user_data: UserData;
  settings: {
    ai_provider?: string;
    theme?: string;
  };
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/**
 * Auth Service
 */
export const auth = {
  // Sign up with email
  async signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Sign in with email
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  // Sign in with Google
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Listen for auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};

/**
 * User Data Service
 */
export const userData = {
  // Save user data (creates or updates)
  async save(data: UserData) {
    // Always save to localStorage first (guaranteed to work)
    localStorage.setItem('awake_user_data', JSON.stringify(data));
    
    const user = await auth.getUser();
    if (!user) {
      // Not logged in - localStorage only
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_data: data,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to save to Supabase:', error);
        // Don't throw - localStorage backup exists
      }
    } catch (err) {
      console.error('Supabase save error:', err);
      // Don't throw - localStorage backup exists
    }
  },

  // Load user data
  async load(): Promise<UserData | null> {
    const user = await auth.getUser();
    
    if (!user) {
      // Not logged in - try localStorage
      const local = localStorage.getItem('awake_user_data');
      return local ? JSON.parse(local) : null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('user_data')
      .eq('id', user.id)
      .single();

    if (error) {
      // Fall back to localStorage
      const local = localStorage.getItem('awake_user_data');
      return local ? JSON.parse(local) : null;
    }

    // Update localStorage with cloud data
    if (data?.user_data) {
      localStorage.setItem('awake_user_data', JSON.stringify(data.user_data));
    }

    return data?.user_data || null;
  },

  // Merge local data with cloud (for first-time sync)
  async syncLocalToCloud() {
    const user = await auth.getUser();
    if (!user) return;

    const local = localStorage.getItem('awake_user_data');
    if (!local) return;

    const localData = JSON.parse(local);
    
    // Check if cloud has data
    const { data: cloudData } = await supabase
      .from('profiles')
      .select('user_data')
      .eq('id', user.id)
      .single();

    if (!cloudData?.user_data) {
      // Cloud is empty, upload local data
      await this.save(localData);
    }
    // If cloud has data, it takes precedence (already loaded)
  },
};

/**
 * Chat History Service
 */
export const chatHistory = {
  // Save a message
  async saveMessage(role: 'user' | 'assistant', content: string) {
    const user = await auth.getUser();
    if (!user) {
      // Not logged in - save to localStorage
      const local = localStorage.getItem('awake_chat_history');
      const messages = local ? JSON.parse(local) : [];
      messages.push({
        id: `${Date.now()}`,
        role,
        content,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem('awake_chat_history', JSON.stringify(messages.slice(-100)));
      return;
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        user_id: user.id,
        role,
        content,
      });

    if (error) throw error;
  },

  // Load recent messages
  async loadRecent(limit = 50): Promise<ChatMessage[]> {
    const user = await auth.getUser();
    
    if (!user) {
      const local = localStorage.getItem('awake_chat_history');
      return local ? JSON.parse(local).slice(-limit) : [];
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      const local = localStorage.getItem('awake_chat_history');
      return local ? JSON.parse(local).slice(-limit) : [];
    }

    return data?.reverse() || [];
  },

  // Clear chat history
  async clear() {
    const user = await auth.getUser();
    
    localStorage.removeItem('awake_chat_history');
    
    if (user) {
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id);
    }
  },
};

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export default supabase;
