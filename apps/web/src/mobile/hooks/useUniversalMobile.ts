"use client";

import * as React from "react";
import { useUniversalBoard } from "../../v0/boards/UniversalBoardContext";
import { useV0Shell } from "../../v0/shell/V0ShellContext";
import { BOARD_DEFINITIONS } from "../../v0/boards/UniversalBoardDefinition";
import { isMemberMobileBoard } from "../../v0/boards/workspaceBoardNav";
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
  const { domainSlug, domainData, domainFrame, workspaceBoardId, shellMode } = useV0Shell();
  const { selection, actions } = useUniversalBoard();
  const ui = useUniversalMobileUI();

  const boardId =
    workspaceBoardId ?? (shellMode === "home" ? "realm" : "domain");
  const boardDef = BOARD_DEFINITIONS[boardId] ?? BOARD_DEFINITIONS.domain;
  const isRealmBoard = boardId === "realm";

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
    boardId,
    boardDef,
    isRealmBoard,
    isMemberMobileBoard: isMemberMobileBoard(boardId),
    activeJourneyId: selection.activeJourneyId,
    selectedMomentId: selection.selectedMomentId,
    activeTab: ui.activeTab,
    kipFocusMomentId: ui.kipFocusMomentId,
    mobileRefreshKey: ui.mobileRefreshKey,
    showInstallPrompt: ui.showInstallPrompt,
    setActiveTab: ui.setActiveTab,
    openMoment,
    closeMoment,
    setActiveJourneyId,
    openKipWithMoment,
    clearKipFocus: ui.clearKipFocus,
    bumpMobileRefresh: ui.bumpMobileRefresh,
    notifyMomentKept,
    submitMobileComposerText: ui.submitMobileComposerText,
    consumePendingComposerText: ui.consumePendingComposerText,
  };
}
