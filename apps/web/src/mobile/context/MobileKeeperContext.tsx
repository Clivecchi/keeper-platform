"use client";

import * as React from "react";
import type { MobileTabId } from "../types";
import { useFrameContextOptional } from "../../v0/shell/FrameContext";
import {
  markHasKeptMoment,
  readActiveJourneyId,
  readHasKeptMoment,
  writeActiveJourneyId,
} from "../lib/mobileStorage";

export interface MobileKeeperContextValue {
  domainSlug: string;
  domainId: string | null;
  domainName: string;
  activeTab: MobileTabId;
  selectedMomentId: string | null;
  activeJourneyId: string | null;
  kipFocusMomentId: string | null;
  worldRefreshKey: number;
  showInstallPrompt: boolean;
  setActiveTab: (tab: MobileTabId) => void;
  openMoment: (momentId: string) => void;
  closeMoment: () => void;
  setActiveJourneyId: (journeyId: string) => void;
  openKipWithMoment: (momentId: string) => void;
  clearKipFocus: () => void;
  refreshWorld: () => void;
  notifyMomentKept: () => void;
}

const MobileKeeperContext = React.createContext<MobileKeeperContextValue | null>(null);

export interface MobileKeeperProviderProps {
  domainSlug: string;
  domainId: string | null;
  domainName: string;
  children: React.ReactNode;
}

export function MobileKeeperProvider({
  domainSlug,
  domainId,
  domainName,
  children,
}: MobileKeeperProviderProps) {
  const frameCtx = useFrameContextOptional();
  const [activeTab, setActiveTabState] = React.useState<MobileTabId>("world");
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null);
  const [kipFocusMomentId, setKipFocusMomentId] = React.useState<string | null>(null);
  const [activeJourneyId, setActiveJourneyIdState] = React.useState<string | null>(() =>
    readActiveJourneyId(domainSlug) ?? frameCtx?.selection.activeJourneyId ?? null,
  );
  const [worldRefreshKey, setWorldRefreshKey] = React.useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(() => readHasKeptMoment());

  React.useEffect(() => {
    if (!frameCtx?.selection.activeJourneyId) return;
    if (activeJourneyId === frameCtx.selection.activeJourneyId) return;
    setActiveJourneyIdState(frameCtx.selection.activeJourneyId);
    writeActiveJourneyId(domainSlug, frameCtx.selection.activeJourneyId);
  }, [frameCtx?.selection.activeJourneyId, activeJourneyId, domainSlug]);

  const setActiveTab = React.useCallback((tab: MobileTabId) => {
    setActiveTabState(tab);
    if (tab !== "kip") {
      setKipFocusMomentId(null);
    }
  }, []);

  const setActiveJourneyId = React.useCallback(
    (journeyId: string) => {
      setActiveJourneyIdState(journeyId);
      writeActiveJourneyId(domainSlug, journeyId);
      frameCtx?.setActiveJourneyId(journeyId);
    },
    [domainSlug, frameCtx],
  );

  const openMoment = React.useCallback((momentId: string) => {
    setSelectedMomentId(momentId);
  }, []);

  const closeMoment = React.useCallback(() => {
    setSelectedMomentId(null);
  }, []);

  const openKipWithMoment = React.useCallback((momentId: string) => {
    setKipFocusMomentId(momentId);
    setSelectedMomentId(null);
    setActiveTabState("kip");
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

  const value = React.useMemo<MobileKeeperContextValue>(
    () => ({
      domainSlug,
      domainId,
      domainName,
      activeTab,
      selectedMomentId,
      activeJourneyId,
      kipFocusMomentId,
      worldRefreshKey,
      showInstallPrompt,
      setActiveTab,
      openMoment,
      closeMoment,
      setActiveJourneyId,
      openKipWithMoment,
      clearKipFocus,
      refreshWorld,
      notifyMomentKept,
    }),
    [
      domainSlug,
      domainId,
      domainName,
      activeTab,
      selectedMomentId,
      activeJourneyId,
      kipFocusMomentId,
      worldRefreshKey,
      showInstallPrompt,
      setActiveTab,
      openMoment,
      closeMoment,
      setActiveJourneyId,
      openKipWithMoment,
      clearKipFocus,
      refreshWorld,
      notifyMomentKept,
    ],
  );

  return (
    <MobileKeeperContext.Provider value={value}>
      {children}
    </MobileKeeperContext.Provider>
  );
}

export function useMobileKeeper(): MobileKeeperContextValue {
  const context = React.useContext(MobileKeeperContext);
  if (!context) {
    throw new Error("useMobileKeeper must be used within MobileKeeperProvider");
  }
  return context;
}
