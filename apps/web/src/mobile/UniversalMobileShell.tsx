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
import { WorldScreen } from "./screens/WorldScreen";
import { PwaInstallPrompt } from "./pwa";
import type { MobileTabId } from "./types";

export interface UniversalMobileShellProps {
  styleId?: StyleId;
  themeSlug?: string | null;
}

const TAB_COPY: Record<MobileTabId, { title: string; subtitle?: string }> = {
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

function UniversalMobileShellBody() {
  const {
    activeTab,
    selectedMomentId,
    showInstallPrompt,
    setActiveTab,
    closeMoment,
  } = useUniversalMobile();

  const copy = TAB_COPY[activeTab];
  const isKipTab = activeTab === "kip";

  return (
    <div
      className="universal-mobile-shell relative flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{ backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%))" }}
    >
      {!selectedMomentId ? (
        <>
          {!isKipTab ? (
            <MobileHeader title={copy.title} subtitle={copy.subtitle} />
          ) : null}
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
          <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
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
