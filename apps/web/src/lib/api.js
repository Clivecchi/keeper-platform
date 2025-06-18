const BASE_URL = import.meta.env.VITE_API_BASE_URL;
export async function apiFetch(path, options = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    });
    if (!res.ok)
        throw res;
    return res.json();
}
