"use client";

/**
 * Universal Mobile — domain board shell for narrow viewports.
 *
 * Board state: UniversalBoardContext (selection, active journey, moment focus).
 * Shell UI: UniversalMobileUIContext (tabs, Kip focus chip, PWA prompt).
 * Same engagement/dialog pipeline as desktop Universal Board.
 */
import * as React from "react";
import "./mobile-shell.css";
import { StyleScope } from "../v0/styles/StyleScope";
import type { StyleId } from "../v0/styles/styles";
import { MobileHeader } from "./components/MobileHeader";
import { MobileTabBar } from "./components/MobileTabBar";
import { UniversalMobileUIProvider } from "./context/UniversalMobileUIContext";
import { useUniversalMobile } from "./hooks/useUniversalMobile";
import { KeepScreen } from "./screens/KeepScreen";
import { JourneysScreen } from "./screens/JourneysScreen";
import { KipScreen } from "./screens/KipScreen";
import { MomentDetailScreen } from "./screens/MomentDetailScreen";
import { RealmScreen } from "./screens/RealmScreen";
import { WorldScreen } from "./screens/WorldScreen";
import { PwaInstallPrompt } from "./pwa";
import type { MobileTabId } from "./types";
import { GuidedArrivalOrchestrator } from "../v0/guidedArrival/GuidedArrivalOrchestrator";

export interface UniversalMobileShellProps {
  styleId?: StyleId;
  themeSlug?: string | null;
}

const DOMAIN_TAB_COPY: Record<MobileTabId, { title: string; subtitle?: string }> = {
  realm: {
    title: "Your Realms",
    subtitle: "Choose where you are keeping — capture from here.",
  },
  world: {
    title: "Your kept moments",
    subtitle: "What you have chosen to keep.",
  },
  moment: {
    title: "Capture a moment",
    subtitle: "Something mattered. Name it and keep it.",
  },
  journeys: {
    title: "Journeys",
    subtitle: "Paths your moments unfold through.",
  },
  kip: {
    title: "Kip",
    subtitle: "Talk through what you are keeping.",
  },
};

const REALM_TAB_COPY: Record<MobileTabId, { title: string; subtitle?: string }> = {
  realm: {
    title: "Your Realms",
    subtitle: "Choose where you are keeping — capture from here.",
  },
  world: {
    title: "Your kept moments",
    subtitle: "What lives in this realm.",
  },
  moment: {
    title: "Capture a moment",
    subtitle: "Something mattered. Name it and keep it.",
  },
  journeys: {
    title: "Journeys",
    subtitle: "Paths your moments unfold through.",
  },
  kip: {
    title: "Dialog",
    subtitle: "Talk with your lead agent.",
  },
};

const DOMAIN_TAB_LABELS: Record<MobileTabId, string> = {
  realm: "Realm",
  world: "World",
  moment: "Moment",
  journeys: "Journeys",
  kip: "Kip",
};

const REALM_TAB_LABELS: Partial<Record<MobileTabId, string>> = {
  world: "World",
  moment: "Moment",
  journeys: "Journeys",
  kip: "Dialog",
};

function UniversalMobileShellBody() {
  const {
    activeTab,
    selectedMomentId,
    showInstallPrompt,
    isRealmBoard,
    setActiveTab,
    closeMoment,
  } = useUniversalMobile();

  const focusKipTab = React.useCallback(() => {
    setActiveTab("kip");
  }, [setActiveTab]);

  const tabCopy = isRealmBoard ? REALM_TAB_COPY : DOMAIN_TAB_COPY;
  const tabLabels = isRealmBoard ? REALM_TAB_LABELS : DOMAIN_TAB_LABELS;
  const copy = tabCopy[activeTab] ?? tabCopy.world;
  const isKipTab = activeTab === "kip";

  React.useEffect(() => {
    if (isRealmBoard && activeTab === "realm") {
      setActiveTab("world");
    }
  }, [isRealmBoard, activeTab, setActiveTab]);
  const isRealmTab = activeTab === "realm";

  return (
    <div
      className="universal-mobile-shell relative flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{ backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%))" }}
    >
      {!selectedMomentId ? (
        <>
          <GuidedArrivalOrchestrator focusMobileKipTab={focusKipTab} showBanner={false} />
          {!isKipTab && !isRealmTab ? (
            <MobileHeader title={copy.title} subtitle={copy.subtitle} />
          ) : null}
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {!isRealmBoard && activeTab === "realm" ? <RealmScreen /> : null}
            {activeTab === "world" ? (
              <div className="mobile-screen-scroll">
                <WorldScreen />
              </div>
            ) : null}
            {activeTab === "moment" ? (
              <div className="mobile-screen-scroll">
                <KeepScreen />
              </div>
            ) : null}
            {activeTab === "journeys" ? (
              <div className="mobile-screen-scroll">
                <JourneysScreen />
              </div>
            ) : null}
            {activeTab === "kip" ? <KipScreen /> : null}
          </main>
          <MobileTabBar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            tabLabels={tabLabels}
            inRealmBoard={isRealmBoard}
          />
        </>
      ) : null}

      {selectedMomentId ? (
        <MomentDetailScreen momentId={selectedMomentId} onClose={closeMoment} />
      ) : null}

      <PwaInstallPrompt
        open={showInstallPrompt}
        title="Install Keeper"
        description="Add Keeper to your home screen for quick access to your world."
      />
    </div>
  );
}

export function UniversalMobileShell({
  styleId = "neutral",
  themeSlug = null,
}: UniversalMobileShellProps) {
  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug} className="keeper-board-scope">
      <UniversalMobileUIProvider>
        <UniversalMobileShellBody />
      </UniversalMobileUIProvider>
    </StyleScope>
  );
}
