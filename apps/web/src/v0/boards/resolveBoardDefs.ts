/**
 * resolveBoardDefs
 * Canonical board definitions — code defs always win over stale domain frame JSON.
 */

import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import { BOARD_DEFINITIONS } from "./UniversalBoardDefinition"

/** Merge domain frame boards[] with code fallback; built-in boardIds use code as source of truth. */
export function resolveBoardDefs(fromFrame?: UniversalBoardDef[] | null): UniversalBoardDef[] {
  const canonical = Object.values(BOARD_DEFINITIONS)
  if (!fromFrame?.length) return canonical

  const frameById = new Map(fromFrame.map((d) => [d.boardId, d]))
  return canonical.map((codeDef) => ({
    ...(frameById.get(codeDef.boardId) ?? {}),
    ...codeDef,
    nav: {
      ...(frameById.get(codeDef.boardId)?.nav ?? {}),
      ...codeDef.nav,
      // Section flags are code-only — frame JSON must not leak boardDefs onto IDE/Agent/Domain.
      sections: { ...codeDef.nav.sections },
    },
    conversation: {
      ...(frameById.get(codeDef.boardId)?.conversation ?? {}),
      ...codeDef.conversation,
    },
    contextSurface: codeDef.contextSurface,
    access: codeDef.access,
  }))
}
