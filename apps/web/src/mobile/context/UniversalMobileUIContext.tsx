"use client";

import * as React from "react";
import type { MobileTabId } from "../types";
import { markHasKeptMoment } from "../lib/mobileStorage";

export interface UniversalMobileUIContextValue {
  activeTab: MobileTabId;
  kipFocusMomentId: string | null;
  worldRefreshKey: number;
  showInstallPrompt: boolean;
  setActiveTab: (tab: MobileTabId) => void;
  setKipFocusMomentId: (momentId: string | null) => void;
  clearKipFocus: () => void;
  refreshWorld: () => void;
  notifyMomentKept: () => void;
}

const UniversalMobileUIContext = React.createContext<UniversalMobileUIContextValue | null>(null);

export interface UniversalMobileUIProviderProps {
  children: React.ReactNode;
}

/** Tab navigation, Kip focus chip, World refresh, and PWA install prompt — mobile shell UI only. */
export function UniversalMobileUIProvider({ children }: UniversalMobileUIProviderProps) {
  const [activeTab, setActiveTabState] = React.useState<MobileTabId>("world");
  const [kipFocusMomentId, setKipFocusMomentId] = React.useState<string | null>(null);
  const [worldRefreshKey, setWorldRefreshKey] = React.useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia("(display-mode: standalone)").matches;
  });

  const setActiveTab = React.useCallback((tab: MobileTabId) => {
    setActiveTabState(tab);
    if (tab !== "kip") {
      setKipFocusMomentId(null);
    }
  }, []);

  const clearKipFocus = React.useCallback(() => {
    setKipFocusMomentId(null);
  }, []);

  const refreshWorld = React.useCallback(() => {
    setWorldRefreshKey((key) => key + 1);
  }, []);

  const notifyMomentKept = React.useCallback(() => {
    markHasKeptMoment();
    setShowInstallPrompt(true);
    refreshWorld();
  }, [refreshWorld]);

  const value = React.useMemo<UniversalMobileUIContextValue>(
    () => ({
      activeTab,
      kipFocusMomentId,
      worldRefreshKey,
      showInstallPrompt,
      setActiveTab,
      setKipFocusMomentId,
      clearKipFocus,
      refreshWorld,
      notifyMomentKept,
    }),
    [
      activeTab,
      kipFocusMomentId,
      worldRefreshKey,
      showInstallPrompt,
      setActiveTab,
      clearKipFocus,
      refreshWorld,
      notifyMomentKept,
    ],
  );

  return (
    <UniversalMobileUIContext.Provider value={value}>
      {children}
    </UniversalMobileUIContext.Provider>
  );
}

export function useUniversalMobileUI(): UniversalMobileUIContextValue {
  const context = React.useContext(UniversalMobileUIContext);
  if (!context) {
    throw new Error("useUniversalMobileUI must be used within UniversalMobileUIProvider");
  }
  return context;
}
