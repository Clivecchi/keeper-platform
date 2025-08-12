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
      // Primary source: Keeper list API (auth-protected)
      try {
        const userId = user?.id;
        const url = userId ? `/api/keeper/keepers?userId=${encodeURIComponent(userId)}` : '/api/keeper/keepers';
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
        // Graceful fallback on 401/404 or any network error
        // Fallback: minimal demo keeper
        const fallback: KeeperSummary = {
          id: 'demo-keeper',
          title: 'Keeper',
          purpose: 'Creative storytelling workspace',
          avatarUrl: undefined,
        };
        setKeepers([fallback]);
        if (!activeKeeperId) setActiveKeeperId(fallback.id);
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


