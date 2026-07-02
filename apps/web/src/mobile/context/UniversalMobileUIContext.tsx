"use client";

import * as React from "react";
import type { MobileTabId } from "../types";
import { markHasKeptMoment } from "../lib/mobileStorage";

export interface UniversalMobileUIContextValue {
  activeTab: MobileTabId;
  kipFocusMomentId: string | null;
  mobileRefreshKey: number;
  showInstallPrompt: boolean;
  setActiveTab: (tab: MobileTabId) => void;
  setKipFocusMomentId: (momentId: string | null) => void;
  submitMobileComposerText: (text: string) => void;
  consumePendingComposerText: () => string | null;
  clearKipFocus: () => void;
  bumpMobileRefresh: () => void;
  notifyMomentKept: () => void;
}

const UniversalMobileUIContext = React.createContext<UniversalMobileUIContextValue | null>(null);

export interface UniversalMobileUIProviderProps {
  children: React.ReactNode;
}

/** Tab navigation, Kip focus chip, content refresh, and PWA install prompt — mobile shell UI only. */
export function UniversalMobileUIProvider({ children }: UniversalMobileUIProviderProps) {
  const [activeTab, setActiveTabState] = React.useState<MobileTabId>("domains");
  const [kipFocusMomentId, setKipFocusMomentId] = React.useState<string | null>(null);
  const pendingComposerRef = React.useRef<string | null>(null);
  const [mobileRefreshKey, setMobileRefreshKey] = React.useState(0);
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

  const submitMobileComposerText = React.useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    pendingComposerRef.current = trimmed;
  }, []);

  const consumePendingComposerText = React.useCallback(() => {
    const value = pendingComposerRef.current;
    pendingComposerRef.current = null;
    return value;
  }, []);

  const bumpMobileRefresh = React.useCallback(() => {
    setMobileRefreshKey((key) => key + 1);
  }, []);

  const notifyMomentKept = React.useCallback(() => {
    markHasKeptMoment();
    setShowInstallPrompt(true);
    bumpMobileRefresh();
  }, [bumpMobileRefresh]);

  const value = React.useMemo<UniversalMobileUIContextValue>(
    () => ({
      activeTab,
      kipFocusMomentId,
      mobileRefreshKey,
      showInstallPrompt,
      setActiveTab,
      setKipFocusMomentId,
      submitMobileComposerText,
      consumePendingComposerText,
      clearKipFocus,
      bumpMobileRefresh,
      notifyMomentKept,
    }),
    [
      activeTab,
      kipFocusMomentId,
      mobileRefreshKey,
      showInstallPrompt,
      setActiveTab,
      submitMobileComposerText,
      consumePendingComposerText,
      clearKipFocus,
      bumpMobileRefresh,
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
