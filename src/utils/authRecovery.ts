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
  if (isPasswordResetPending()) return true;
  return false;
}

/** After PKCE code exchange, PASSWORD_RECOVERY may fire slightly after INITIAL_SESSION. */
export function waitForPasswordRecoveryEvent(
  client: SupabaseClient,
  timeoutMs = 2000,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (settled) return;
      if (event === 'PASSWORD_RECOVERY') {
        settled = true;
        subscription.unsubscribe();
        resolve(true);
      }
    });

    window.setTimeout(() => {
      if (settled) return;
      settled = true;
      subscription.unsubscribe();
      resolve(false);
    }, timeoutMs);
  });
}
