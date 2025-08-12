/**
 * Keeper Context
 * --------------
 * Provides active Keeper scope for Board Studio and related pages.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api';

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
  const [keepers, setKeepers] = useState<KeeperSummary[]>([]);
  const [activeKeeperId, setActiveKeeperId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshKeepers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Primary source: KAM-backed API
      try {
        const result = await apiFetch('/api/keeper/current');
        const list = Array.isArray(result?.keepers) ? result.keepers : result ? [result] : [];
        setKeepers(list);
        if (list.length > 0 && !activeKeeperId) {
          setActiveKeeperId(list[0].id);
        }
      } catch (apiErr) {
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
  }, [activeKeeperId]);

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


