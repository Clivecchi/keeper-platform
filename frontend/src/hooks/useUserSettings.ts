// TASK: Create a React hook that fetches the current user's settings
// 📄 File: src/hooks/useUserSettings.ts

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

interface UserSettings {
  id: string;
  userId: string;
  themeMode?: string;
  preferred_theme_id?: string;
  respectSystemTheme?: boolean;
  // Add any other settings fields as needed
}

type UserSettingsResponse =
  | {
      success: true;
      data: UserSettings;
    }
  | {
      success: false;
      error: string;
    };

interface UseUserSettingsResult {
  settings: UserSettings | null;
  loading: boolean;
  error: string | null;
}

export function useUserSettings(): UseUserSettingsResult {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const token = localStorage.getItem('token'); // Or fetch from context
        const data = (await apiFetch('/api/kam/settings', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })) as UserSettingsResponse;

        if (data.success) {
          setSettings(data.data);
        } else {
          throw new Error(data.error || 'Unknown error');
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  return { settings, loading, error };
} 