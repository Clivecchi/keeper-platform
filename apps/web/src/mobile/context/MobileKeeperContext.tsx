"use client";

import * as React from "react";
import type { MobileTabId } from "../types";
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
  worldRefreshKey: number;
  showInstallPrompt: boolean;
  setActiveTab: (tab: MobileTabId) => void;
  openMoment: (momentId: string) => void;
  closeMoment: () => void;
  setActiveJourneyId: (journeyId: string) => void;
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
  const [activeTab, setActiveTab] = React.useState<MobileTabId>("world");
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null);
  const [activeJourneyId, setActiveJourneyIdState] = React.useState<string | null>(() =>
    readActiveJourneyId(domainSlug),
  );
  const [worldRefreshKey, setWorldRefreshKey] = React.useState(0);
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(() => readHasKeptMoment());

  const setActiveJourneyId = React.useCallback(
    (journeyId: string) => {
      setActiveJourneyIdState(journeyId);
      writeActiveJourneyId(domainSlug, journeyId);
    },
    [domainSlug],
  );

  const openMoment = React.useCallback((momentId: string) => {
    setSelectedMomentId(momentId);
  }, []);

  const closeMoment = React.useCallback(() => {
    setSelectedMomentId(null);
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
      worldRefreshKey,
      showInstallPrompt,
      setActiveTab,
      openMoment,
      closeMoment,
      setActiveJourneyId,
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
      worldRefreshKey,
      showInstallPrompt,
      setActiveJourneyId,
      openMoment,
      closeMoment,
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
