const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    console.error(`API Error (${path}):`, {
      status: res.status,
      statusText: res.statusText,
      headers: Object.fromEntries(res.headers.entries()),
    });
    throw res;
  }
  return res.json();
} 