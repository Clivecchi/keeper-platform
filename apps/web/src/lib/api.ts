const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    // Create a proper error object instead of throwing the response
    // This prevents browser authentication prompts
    const errorBody = await res.text().catch(() => 'Network error');
    const error = new Error(`HTTP ${res.status}: ${res.statusText}`) as Error & {
      status: number;
      statusText: string;
      body: string;
    };
    error.status = res.status;
    error.statusText = res.statusText;
    error.body = errorBody;
    throw error;
  }
  
  return res.json();
} 