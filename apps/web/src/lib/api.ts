// Use same-origin calls; leave env override for local dev if explicitly set
const BASE_URL = '';

export async function apiFetch(path: string, init?: RequestInit): Promise<any> {
  // Get token from localStorage for authenticated requests
  const token = localStorage.getItem('keeper_token');
  
  const res = await fetch(`${BASE_URL}${path}`, {
    ...(init || {}),
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include'
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
} 