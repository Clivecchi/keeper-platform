const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://keeper-platform-production.up.railway.app';
console.log('[API] Base URL:', BASE_URL);

export async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${BASE_URL}${path}`;
  console.log('[API] Making request to:', url);
  console.log('[API] Request options:', JSON.stringify(options, null, 2));

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    console.log('[API] Response status:', res.status);
    console.log('[API] Response headers:', Object.fromEntries(res.headers.entries()));

    if (!res.ok) {
      console.error(`[API] Error (${path}):`, {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
      });
      throw res;
    }

    const data = await res.json();
    console.log('[API] Response data:', data);
    return data;
  } catch (error) {
    console.error('[API] Fetch error:', error);
    throw error;
  }
} 