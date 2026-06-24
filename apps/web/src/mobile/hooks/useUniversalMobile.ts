"use client";

import * as React from "react";
import { useUniversalBoard } from "../../v0/boards/UniversalBoardContext";
import { useV0Shell } from "../../v0/shell/V0ShellContext";
import { useUniversalMobileUI } from "../context/UniversalMobileUIContext";

function resolveDomainId(domainData: unknown): string | null {
  const id = (domainData as { id?: string } | null | undefined)?.id;
  if (!id || String(id).startsWith("fallback-")) return null;
  return String(id);
}

/**
 * Universal Mobile — composes Universal Board selection/actions with mobile shell UI state.
 * Domain identity comes from V0Shell; board state from UniversalBoardContext.
 */
export function useUniversalMobile() {
  const { domainSlug, domainData, domainFrame } = useV0Shell();
  const { selection, actions } = useUniversalBoard();
  const ui = useUniversalMobileUI();

  const domainId = resolveDomainId(domainData);
  const domainName = React.useMemo(() => {
    const fromFrame = (domainFrame?.theme as { wordmark?: string } | undefined)?.wordmark?.trim();
    const fromData = (domainData as { name?: string } | undefined)?.name?.trim();
    return fromFrame || fromData || domainSlug;
  }, [domainFrame, domainData, domainSlug]);

  const openMoment = React.useCallback(
    (momentId: string) => {
      actions.onMomentSelect(momentId);
    },
    [actions],
  );

  const closeMoment = React.useCallback(() => {
    actions.onMomentClear();
  }, [actions]);

  const setActiveJourneyId = React.useCallback(
    (journeyId: string) => {
      actions.onSetActiveJourney(journeyId);
    },
    [actions],
  );

  const openKipWithMoment = React.useCallback(
    (momentId: string) => {
      ui.setKipFocusMomentId(momentId);
      actions.onMomentClear();
      ui.setActiveTab("kip");
    },
    [ui, actions],
  );

  const notifyMomentKept = React.useCallback(() => {
    ui.notifyMomentKept();
    actions.bumpJourneyNav();
  }, [ui, actions]);

  return {
    domainSlug,
    domainId,
    domainName,
    activeJourneyId: selection.activeJourneyId,
    selectedMomentId: selection.selectedMomentId,
    activeTab: ui.activeTab,
    kipFocusMomentId: ui.kipFocusMomentId,
    worldRefreshKey: ui.worldRefreshKey,
    showInstallPrompt: ui.showInstallPrompt,
    setActiveTab: ui.setActiveTab,
    openMoment,
    closeMoment,
    setActiveJourneyId,
    openKipWithMoment,
    clearKipFocus: ui.clearKipFocus,
    refreshWorld: ui.refreshWorld,
    notifyMomentKept,
  };
}
