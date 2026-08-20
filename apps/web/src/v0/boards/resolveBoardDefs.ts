/**
 * resolveBoardDefs
 * Canonical board definitions — code defs always win over stale domain frame JSON.
 */

import { normalizeUniversalBoardId } from "@keeper/shared"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import { BOARD_DEFINITIONS } from "./UniversalBoardDefinition"

/** Merge domain frame boards[] with code fallback; built-in boardIds use code as source of truth. */
export function resolveBoardDefs(fromFrame?: UniversalBoardDef[] | null): UniversalBoardDef[] {
  const canonical = Object.values(BOARD_DEFINITIONS)
  if (!fromFrame?.length) return canonical

  const frameById = new Map(
    fromFrame.map((d) => [normalizeUniversalBoardId(d.boardId) ?? d.boardId, d]),
  )
  return canonical.map((codeDef) => {
    const frameDef = frameById.get(codeDef.boardId)
    return {
      ...(frameDef ?? {}),
      ...codeDef,
      nav: {
        ...(frameDef?.nav ?? {}),
        ...codeDef.nav,
        // Section flags are code-only — frame JSON must not leak boardDefs onto Build/Agent/Domain.
        sections: { ...codeDef.nav.sections },
        navBlockOrder: codeDef.nav.navBlockOrder,
        externalAccessSummary: codeDef.nav.externalAccessSummary,
        aiAccessSummary: codeDef.nav.aiAccessSummary,
      },
      conversation: {
        ...(frameDef?.conversation ?? {}),
        ...codeDef.conversation,
      },
      contextSurface: codeDef.contextSurface,
      access: codeDef.access,
    }
  })
}
