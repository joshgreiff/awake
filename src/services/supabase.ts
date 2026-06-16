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
import { isOnboardingComplete } from '../utils/onboardingProgress';
import { normalizeUserData, type SaveResult } from '../utils/userDataNormalize';
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

  // Get current user (validated with auth server when online)
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.user ?? null;
    }
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

export type { SaveResult } from '../utils/userDataNormalize';

/**
 * User Data Service
 */
export const userData = {
  async getAuthUser(): Promise<{ id: string; email?: string } | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      return { id: session.user.id, email: session.user.email };
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return { id: user.id, email: user.email };
    return null;
  },

  async fetchCloudProfile(userId: string): Promise<UserData | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_data')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Cloud profile fetch failed:', error.message, error.code);
      return null;
    }

    const raw = data?.user_data;
    if (!raw || typeof raw !== 'object') return null;
    const parsed = raw as UserData;
    if (Object.keys(parsed).length === 0) return null;
    return parsed;
  },

  mergeUserData(base: UserData | null | undefined, patch: UserData): UserData {
    return {
      ...base,
      ...patch,
      identity: patch.identity
        ? { ...base?.identity, ...patch.identity }
        : base?.identity,
      domains: patch.domains ? { ...base?.domains, ...patch.domains } : base?.domains,
      cockpitSync: patch.cockpitSync ?? base?.cockpitSync,
    };
  },

  // Save user data (creates or updates) — returns result so callers know if cloud worked
  async save(data: UserData): Promise<SaveResult> {
    const authUser = await this.getAuthUser();
    const normalized = normalizeUserData(data);

    let payload: UserData = {
      ...normalized,
      cockpitSync: normalized.cockpitSync ?? buildCockpitSyncSnapshot(),
    };

    if (authUser) {
      const cloud = await this.fetchCloudProfile(authUser.id);
      if (cloud) {
        payload = this.mergeUserData(cloud, payload);
      }
      if (isOnboardingComplete(cloud) && !isOnboardingComplete(normalized)) {
        payload = cloud!;
      }
    }

    payload = normalizeUserData(payload);
    localStorage.setItem('awake_user_data', JSON.stringify(payload));

    if (!authUser) {
      return { ok: true };
    }

    const row = {
      id: authUser.id,
      email: authUser.email ?? null,
      user_data: payload,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.error('Failed to save to Supabase:', error.message, error.code, error.details);
      return { ok: false, error: error.message, localOnly: true };
    }

    if (isOnboardingComplete(payload)) {
      const verify = await this.fetchCloudProfile(authUser.id);
      if (!isOnboardingComplete(verify)) {
        return {
          ok: false,
          error: 'Save appeared to succeed but profile did not persist. Check Supabase RLS policies.',
          localOnly: true,
        };
      }
    }

    return { ok: true };
  },

  // Load user data
  async load(): Promise<UserData | null> {
    const authUser = await this.getAuthUser();
    const localRaw = localStorage.getItem('awake_user_data');
    const localData = localRaw ? (JSON.parse(localRaw) as UserData) : null;

    if (!authUser) {
      if (localData?.cockpitSync) {
        applyCockpitSyncToLocalStorage(localData.cockpitSync);
      }
      return localData;
    }

    const cloudData = await this.fetchCloudProfile(authUser.id);
    const cloudComplete = isOnboardingComplete(cloudData);
    const localComplete = isOnboardingComplete(localData);

    let resolved: UserData | null = null;

    if (cloudComplete) {
      resolved = cloudData;
    } else if (localComplete) {
      resolved = localData;
      void this.save(localData!);
    } else if (cloudData && Object.keys(cloudData).length > 0) {
      resolved = cloudData;
    } else {
      resolved = localData;
    }

    if (resolved) {
      localStorage.setItem('awake_user_data', JSON.stringify(resolved));
      if (resolved.cockpitSync) {
        applyCockpitSyncToLocalStorage(resolved.cockpitSync);
      }
    }

    return resolved;
  },

  // Merge local data with cloud (for first-time sync)
  async syncLocalToCloud() {
    const authUser = await this.getAuthUser();
    if (!authUser) return;

    const localRaw = localStorage.getItem('awake_user_data');
    const localData = localRaw ? (JSON.parse(localRaw) as UserData) : null;

    const cloudData = await this.fetchCloudProfile(authUser.id);

    if (isOnboardingComplete(cloudData)) return;

    if (localData && isOnboardingComplete(localData)) {
      localData.cockpitSync = buildCockpitSyncSnapshot();
      await this.save(localData);
    }
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
