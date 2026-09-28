export const CLEARING_PATH = '/clearing';

export function isClearingRoute(pathname = window.location.pathname): boolean {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  return normalized === CLEARING_PATH;
}
