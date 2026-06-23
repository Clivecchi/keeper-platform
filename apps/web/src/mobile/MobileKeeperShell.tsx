"use client";

import * as React from "react";
import { StyleScope } from "../v0/styles/StyleScope";
import type { StyleId } from "../v0/styles/styles";
import { MobileHeader } from "./components/MobileHeader";
import { MobileTabBar } from "./components/MobileTabBar";
import { MobileKeeperProvider, useMobileKeeper } from "./context/MobileKeeperContext";
import { KeepScreen } from "./screens/KeepScreen";
import { JourneysScreen } from "./screens/JourneysScreen";
import { MomentDetailScreen } from "./screens/MomentDetailScreen";
import { WorldScreen } from "./screens/WorldScreen";
import { PwaInstallPrompt } from "./pwa";
import type { MobileTabId } from "./types";

export interface MobileKeeperShellProps {
  domainSlug: string;
  domainId: string | null;
  domainName: string;
  styleId?: StyleId;
  themeSlug?: string | null;
}

const TAB_COPY: Record<MobileTabId, { title: string; subtitle?: string }> = {
  world: {
    title: "Your kept moments",
    subtitle: "What you have chosen to keep.",
  },
  keep: {
    title: "Keep a moment",
    subtitle: "Something mattered. Capture it here.",
  },
  journeys: {
    title: "Journeys",
    subtitle: "Paths your moments unfold through.",
  },
};

function MobileKeeperShellBody() {
  const {
    activeTab,
    selectedMomentId,
    domainName,
    showInstallPrompt,
    setActiveTab,
    closeMoment,
  } = useMobileKeeper();

  const copy = TAB_COPY[activeTab];

  return (
    <div
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden"
      style={{ backgroundColor: "hsl(var(--theme-surface-page, 40 20% 97%))" }}
    >
      {!selectedMomentId ? (
        <>
          <MobileHeader title={copy.title} subtitle={copy.subtitle} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            {activeTab === "world" ? <WorldScreen /> : null}
            {activeTab === "keep" ? <KeepScreen /> : null}
            {activeTab === "journeys" ? <JourneysScreen /> : null}
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

export function MobileKeeperShell({
  domainSlug,
  domainId,
  domainName,
  styleId = "neutral",
  themeSlug = null,
}: MobileKeeperShellProps) {
  const resolvedName = domainName.trim() || domainSlug;

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <MobileKeeperProvider
        domainSlug={domainSlug}
        domainId={domainId}
        domainName={resolvedName}
      >
        <MobileKeeperShellBody />
      </MobileKeeperProvider>
    </StyleScope>
  );
}
