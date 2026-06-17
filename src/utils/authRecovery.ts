import type { AuthChangeEvent, SupabaseClient } from '@supabase/supabase-js';

/** Set when user requests a reset email — survives redirect in a new tab. */
export const PENDING_PASSWORD_RESET_KEY = 'awake_pending_password_reset';

const PENDING_TTL_MS = 60 * 60 * 1000;

export function markPasswordResetPending(): void {
  localStorage.setItem(PENDING_PASSWORD_RESET_KEY, String(Date.now()));
}

export function clearPasswordResetPending(): void {
  localStorage.removeItem(PENDING_PASSWORD_RESET_KEY);
}

export function isPasswordResetPending(): boolean {
  const raw = localStorage.getItem(PENDING_PASSWORD_RESET_KEY);
  if (!raw) return false;
  const ts = Number(raw);
  if (Number.isNaN(ts) || Date.now() - ts > PENDING_TTL_MS) {
    localStorage.removeItem(PENDING_PASSWORD_RESET_KEY);
    return false;
  }
  return true;
}

export function isPasswordRecoveryUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const { search, hash } = window.location;
  return hash.includes('type=recovery') || search.includes('type=recovery');
}

/** PKCE email links use ?code= — same shape as signup; don't treat as normal sign-in. */
export function hasAuthCallbackInUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const { search, hash } = window.location;
  return (
    search.includes('code=') ||
    hash.includes('access_token=') ||
    hash.includes('type=signup') ||
    hash.includes('type=email') ||
    hash.includes('type=recovery') ||
    search.includes('type=recovery')
  );
}

export function clearAuthCallbackFromUrl(): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(null, '', window.location.pathname);
}

export function shouldOpenPasswordReset(event: AuthChangeEvent): boolean {
  if (event === 'PASSWORD_RECOVERY') return true;
  if (isPasswordRecoveryUrl()) return true;
  return false;
}

const SESSION_INIT_TIMEOUT_MS = 10_000;

/** Avoid hanging forever on stale PKCE codes or auth deadlocks. */
export async function getSessionWithTimeout(
  client: SupabaseClient,
  timeoutMs = SESSION_INIT_TIMEOUT_MS,
) {
  return Promise.race([
    client.auth.getSession(),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Auth session timed out')), timeoutMs);
    }),
  ]);
}
