export const COCKPIT_SYNC_EVENT = 'awake-cockpit-local-changed';

export function notifyCockpitLocalChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(COCKPIT_SYNC_EVENT));
}
