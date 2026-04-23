import { SITE_STORAGE_KEY } from '../context/SiteContext';

const BASE = '/api';

function getSiteId(): string | null {
  return localStorage.getItem(SITE_STORAGE_KEY);
}

function withSiteId(path: string): string {
  const siteId = getSiteId();
  if (!siteId) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}siteId=${siteId}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(withSiteId(path)),
  post: <T>(path: string, body: unknown) => request<T>(withSiteId(path), { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
