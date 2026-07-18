/**
 * Map an active board definition to the nav slices that must be warm
 * before the load curtain reveals the board.
 */

import { peekDomainFrame } from "../../data/loadDomainFrame"
import type { BoardNavPrefetchSections } from "../boardNavDataCache"
import { BOARD_DEFINITIONS, type UniversalBoardDef } from "../UniversalBoardDefinition"
import { resolveBoardDefs } from "../resolveBoardDefs"

/** Domain-board defaults when frame/board def is not yet available. */
export const DEFAULT_REVEAL_NAV_SECTIONS: BoardNavPrefetchSections = {
  dialogs: true,
  journeys: true,
  keepers: true,
  drafts: false,
  agents: true,
  library: true,
}

function sectionsFromDef(def: UniversalBoardDef): BoardNavPrefetchSections {
  return {
    journeys: !!def.nav.sections.journeys,
    keepers: !!def.nav.sections.keepers,
    dialogs: !!def.nav.sections.dialogs,
    drafts: !!def.nav.sections.drafts,
    agents:
      !!def.nav.sections.agents ||
      (def.conversation.kipMode === "domain" &&
        def.conversation.dialogOrchestration === "director"),
    library: !!def.nav.sections.library,
  }
}

/**
 * Resolve which Nav lists the curtain should await for this slug + board.
 * Prefers frame_json board defs; falls back to code BOARD_DEFINITIONS / domain defaults.
 */
export function resolveRevealNavSections(
  slug: string,
  boardId = "domain",
): BoardNavPrefetchSections {
  const normalized = slug.trim().toLowerCase()
  const defs = resolveBoardDefs(peekDomainFrame(normalized)?.boards)
  const fromFrame = defs.find((d) => d.boardId === boardId)
  if (fromFrame) return sectionsFromDef(fromFrame)

  const fromCode = BOARD_DEFINITIONS[boardId]
  if (fromCode) return sectionsFromDef(fromCode)

  return { ...DEFAULT_REVEAL_NAV_SECTIONS }
}
