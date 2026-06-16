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
import { getAuthRedirectUrl } from '../utils/authRedirect';
import { applyCockpitSyncToLocalStorage, buildCockpitSyncSnapshot, notifyCockpitLocalChanged } from '../utils/cockpitCloudSync';
import {
  appendMessageToActiveLoaChat,
  parseLoaChatsStorage,
  persistLoaChats,
  LOA_CHATS_STORAGE_KEY,
} from '../utils/loaChatStorage';

// These will be replaced with your actual Supabase credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client (PKCE + detect email/OAuth callback tokens in URL)
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    flowType: 'pkce',
    detectSessionInUrl: true,
    persistSession: true,
  },
});

export type SignUpOutcome = 'signed_in' | 'confirm_email' | 'already_registered';

export function formatAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : 'Something went wrong';

  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox (and spam), or resend the link below.';
  }
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Wrong email or password. Try again or create an account.';
  }
  if (message.toLowerCase().includes('user already registered')) {
    return 'This email already has an account. Sign in instead.';
  }

  return message;
}

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
  async signUp(email: string, password: string): Promise<SignUpOutcome> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) throw error;

    // Supabase returns a user with no identities when email is already registered
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      return 'already_registered';
    }
    if (data.session) {
      return 'signed_in';
    }
    return 'confirm_email';
  },

  async resendConfirmation(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) throw error;
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
        redirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) throw error;
    return data;
  },

  // Sign out (ends session on this device and other tabs when possible)
  async signOut() {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
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
    const payload: UserData = {
      ...data,
      cockpitSync: data.cockpitSync ?? buildCockpitSyncSnapshot(),
    };
    // Always save to localStorage first (guaranteed to work)
    localStorage.setItem('awake_user_data', JSON.stringify(payload));
    
    const user = await Promise.race([
      auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);
    if (!user) {
      // Not logged in - localStorage only
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          user_data: payload,
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
      const parsed = local ? JSON.parse(local) : null;
      if (parsed?.cockpitSync) {
        applyCockpitSyncToLocalStorage(parsed.cockpitSync);
      }
      return parsed;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('user_data')
      .eq('id', user.id)
      .single();

    if (error) {
      // Fall back to localStorage
      const local = localStorage.getItem('awake_user_data');
      const parsed = local ? JSON.parse(local) : null;
      if (parsed?.cockpitSync) {
        applyCockpitSyncToLocalStorage(parsed.cockpitSync);
      }
      return parsed;
    }

    // Update localStorage with cloud data
    if (data?.user_data) {
      localStorage.setItem('awake_user_data', JSON.stringify(data.user_data));
      applyCockpitSyncToLocalStorage(data.user_data.cockpitSync);
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
    // Attach latest cockpit keys so first sign-in uploads rituals/tasks/widgets too
    localData.cockpitSync = buildCockpitSyncSnapshot();

    // Check if cloud has data
    const { data: cloudData } = await supabase
      .from('profiles')
      .select('user_data')
      .eq('id', user.id)
      .single();

    if (!cloudData?.user_data) {
      // Cloud is empty, upload local data (includes cockpit snapshot)
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
      const raw = localStorage.getItem(LOA_CHATS_STORAGE_KEY);
      const state = parseLoaChatsStorage(raw);
      const next = appendMessageToActiveLoaChat(state, {
        id: `${Date.now()}`,
        role,
        content,
      });
      persistLoaChats(next);
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
      const raw = localStorage.getItem(LOA_CHATS_STORAGE_KEY);
      const state = parseLoaChatsStorage(raw);
      const active = state.conversations.find((c) => c.id === state.activeId);
      const msgs = active?.messages.slice(-limit) ?? [];
      return msgs.map((m) => ({
        id: m.id,
        user_id: '',
        role: m.role,
        content: m.content,
        created_at: m.timestamp,
      })) as ChatMessage[];
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      const raw = localStorage.getItem(LOA_CHATS_STORAGE_KEY);
      const state = parseLoaChatsStorage(raw);
      const active = state.conversations.find((c) => c.id === state.activeId);
      const msgs = active?.messages.slice(-limit) ?? [];
      return msgs.map((m) => ({
        id: m.id,
        user_id: '',
        role: m.role,
        content: m.content,
        created_at: m.timestamp,
      })) as ChatMessage[];
    }

    return data?.reverse() || [];
  },

  // Clear chat history
  async clear() {
    const user = await auth.getUser();
    
    localStorage.removeItem(LOA_CHATS_STORAGE_KEY);
    notifyCockpitLocalChanged();

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
