/**
 * Keeper Context
 * --------------
 * Provides active Keeper scope for Board Studio and related pages.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';
import { useAuth } from './AuthContext';

export interface KeeperSummary {
  id: string;
  title: string;
  purpose?: string;
  avatarUrl?: string;
}

interface KeeperContextType {
  keepers: KeeperSummary[];
  activeKeeper: KeeperSummary | null;
  isLoading: boolean;
  error: string | null;
  setActiveKeeperId: (keeperId: string) => void;
  refreshKeepers: () => Promise<void>;
}

const KeeperContext = createContext<KeeperContextType | undefined>(undefined);

export const KeeperProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [keepers, setKeepers] = useState<KeeperSummary[]>([]);
  const [activeKeeperId, setActiveKeeperId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshKeepers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userId = user?.id;

      // If we don't have an authenticated user context, do not call the API.
      if (!userId) {
        setKeepers([]);
        setActiveKeeperId(null);
        return;
      }

      // Primary source: Keeper list API (auth-protected)
      const url = `/api/keeper/keepers?userId=${encodeURIComponent(userId)}`;
      try {
        const result = await apiFetch(url);
        const list = Array.isArray((result as any)?.keepers)
          ? (result as any).keepers
          : Array.isArray(result)
            ? (result as any)
            : (result ? [result] : []);
        setKeepers(list);
        if (list.length > 0 && !activeKeeperId) {
          setActiveKeeperId(list[0].id);
        }
      } catch (apiErr: any) {
        // Graceful fallback on network/API errors
        if (keepers.length === 0) {
          setKeepers([]);
          setActiveKeeperId(null);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load keepers');
    } finally {
      setIsLoading(false);
    }
  }, [activeKeeperId, user?.id]);

  useEffect(() => {
    void refreshKeepers();
  }, [refreshKeepers]);

  const value = useMemo<KeeperContextType>(() => ({
    keepers,
    activeKeeper: keepers.find(k => k.id === activeKeeperId) || keepers[0] || null,
    isLoading,
    error,
    setActiveKeeperId: (id: string) => setActiveKeeperId(id),
    refreshKeepers,
  }), [keepers, activeKeeperId, isLoading, error, refreshKeepers]);

  return <KeeperContext.Provider value={value}>{children}</KeeperContext.Provider>;
};

export const useKeeperContext = (): KeeperContextType => {
  const ctx = useContext(KeeperContext);
  if (!ctx) throw new Error('useKeeperContext must be used within a KeeperProvider');
  return ctx;
};


