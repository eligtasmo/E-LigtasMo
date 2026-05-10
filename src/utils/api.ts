// src/utils/api.ts
export const API_BASE = import.meta.env.VITE_API_URL || "https://api.eligtasmo.site";

export async function apiFetch(path: string, options: RequestInit = {}) {
  const cleanedPath = path.replace(/^\//, '');
  // If API_BASE is relative (/api), ensure it works in dev and prod
  const url = API_BASE.startsWith('http') ? `${API_BASE}/${cleanedPath}` : `${API_BASE}/${cleanedPath}`;
  
  const token = localStorage.getItem('access_token');
  const headers = {
    ...options.headers,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const opts: RequestInit = {
    credentials: 'omit', // Use 'omit' to avoid CORS issues with cookies since we use Bearer tokens
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
    console.error(`Tactical API Failure: ${url}`, e);
    throw e;
  }
}
