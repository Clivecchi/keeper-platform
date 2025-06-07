// TASK: Create a React hook that fetches the current user's settings
// 📄 File: src/hooks/useUserSettings.ts
import { useEffect, useState } from 'react';
export function useUserSettings() {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        async function fetchSettings() {
            try {
                const token = localStorage.getItem('token'); // Or fetch from context
                const res = await fetch('/api/kam/settings', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = (await res.json());
                if (data.success) {
                    setSettings(data.data);
                }
                else {
                    throw new Error(data.error || 'Unknown error');
                }
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(message);
            }
            finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);
    return { settings, loading, error };
}
