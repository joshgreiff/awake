/**
 * Auth redirect URL for Supabase email links and OAuth.
 * Must be whitelisted in Supabase Dashboard → Auth → URL Configuration.
 */
export function getAuthRedirectUrl(): string {
  if (typeof window === 'undefined') {
    return 'https://www.awakeapp.space';
  }
  return window.location.origin;
}
