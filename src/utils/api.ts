// src/utils/api.ts
// Prefer same-origin relative API path to leverage Vite dev proxy and avoid CORS.
export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const cleanedPath = path.replace(/^\//, '');
  const url = `${API_BASE}/${cleanedPath}`;
  const token = localStorage.getItem('access_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  const opts: RequestInit = {
    credentials: 'include',
    ...options,
    headers
  };
  try {
    const res = await fetch(url, opts);
    if (!res.ok && res.status === 404) {
      throw new Error('404');
    }
    return res;
  } catch (e) {
    // Fallbacks for environments without proxy support or if proxy fails
    const host = window.location.hostname;
    // Try absolute to current host under /eligtasmo latest/api
    try {
      const absCurrent = `${window.location.protocol}//${host}/eligtasmo%20latest/api/${cleanedPath}`;
      const res = await fetch(absCurrent, opts);
      return res;
    } catch (_) {}
    // Try localhost fallback
    try {
      const absLocal = `${window.location.protocol}//localhost/eligtasmo%20latest/api/${cleanedPath}`;
      const res2 = await fetch(absLocal, opts);
      return res2;
    } catch (_) {}
    throw e;
  }
}
