export const API_BASE: string = (import.meta as any).env.VITE_API_URL as string;

export const api = {
  get: (path: string, init?: RequestInit) => {
    const url = new URL(path.replace(/^\/+/, ''), API_BASE).toString();
    return fetch(url, { ...init, method: 'GET' });
  },
  post: (path: string, body?: unknown, init?: RequestInit) => {
    const url = new URL(path.replace(/^\/+/, ''), API_BASE).toString();
    return fetch(url, {
      ...init,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },
};

export { apiFetch } from './apiFetch';