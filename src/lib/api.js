const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Normalise base URL so no trailing slash ("https://example.com/api/") → "https://example.com/api"
const BASE_URL = RAW_BASE_URL ? RAW_BASE_URL.replace(/\/+$/, '') : '';

function joinUrl(base, path) {
  if (!base) return path; // relative fetch, Vite proxy handles it in dev

  // Prevent duplicate "/api/api" when the env already ends with /api
  if (base.endsWith('/api') && path.startsWith('/api')) {
    return `${base}${path.slice(4)}`; // remove leading /api from path
  }
  return `${base}${path}`;
}

export async function apiFetch(path, options = {}) {
  const url = joinUrl(BASE_URL, path);
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw res;
  return res.json();
}
