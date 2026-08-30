/**
 * Nav panes — Universal · Keepers · Config
 *
 * Every board shares the same three-pane Nav shell so Dialogs and Drafts
 * never disappear when the workspace changes. Board defs still own Config.
 */

import type { NavRenderBlock, UniversalBoardDef } from "./UniversalBoardDefinition"

export type NavPaneId = "universal" | "keepers" | "config"

export const NAV_PANE_LABELS: Record<NavPaneId, string> = {
  universal: "Universal",
  keepers: "Keepers",
  config: "Config",
}

/** Dialog, Draft, Chatter, Library — always on, every board. Sessions stay Design-gated. Stage is Realm-only. */
export const UNIVERSAL_NAV_BLOCKS: NavRenderBlock[] = [
  "dialogs",
  "sessions",
  "drafts",
  "chatter",
  "library",
  "stage",
]

/** Keeper, Journeys, Moment (Moment is a create card under the selected Journey). */
export const KEEPERS_NAV_BLOCKS: NavRenderBlock[] = ["keepers", "journeys"]

/** Board-specific Config — integrations, keys, agents, glossary, board defs, … */
export const CONFIG_NAV_BLOCKS: NavRenderBlock[] = [
  "integrations",
  "keys",
  "aiAccess",
  "externalAccess",
  "capabilities",
  "glossary",
  "connections",
  "agents",
  "boardDefs",
  "boards",
]

const CONFIG_BLOCK_SET = new Set<NavRenderBlock>(CONFIG_NAV_BLOCKS)

export function isConfigNavBlock(block: NavRenderBlock): boolean {
  return CONFIG_BLOCK_SET.has(block)
}

export function isUniversalAlwaysOnBlock(block: NavRenderBlock): boolean {
  return (
    block === "dialogs" ||
    block === "drafts" ||
    block === "chatter" ||
    block === "library"
  )
}

export function isKeepersAlwaysOnBlock(block: NavRenderBlock): boolean {
  return block === "keepers" || block === "journeys"
}

export function configBlockEnabled(
  def: UniversalBoardDef,
  block: NavRenderBlock,
): boolean {
  switch (block) {
    case "integrations":
      return (def.nav.integrations?.length ?? 0) > 0
    case "keys":
      return (def.nav.integrations ?? []).some((item) => item.group === "ai")
    case "aiAccess":
      return def.nav.aiAccessSummary === true
    case "externalAccess":
      return def.nav.externalAccessSummary === true
    case "capabilities":
      return def.nav.sections.capabilities === true
    case "glossary":
      return def.nav.sections.glossary === true
    case "connections":
      return def.boardId === "realm"
    case "agents":
      return def.nav.sections.agents === true
    case "boardDefs":
      return def.nav.sections.boardDefs === true
    case "boards":
      return def.boardId === "domain" || def.boardId === "realm"
    default:
      return false
  }
}

/** Config pane order: board `navBlockOrder` first, then remaining enabled Config blocks. */
export function resolveConfigBlockOrder(def: UniversalBoardDef): NavRenderBlock[] {
  const enabled = CONFIG_NAV_BLOCKS.filter((block) => configBlockEnabled(def, block))
  const ordered = (def.nav.navBlockOrder ?? []).filter((block) => enabled.includes(block))
  const remainder = enabled.filter((block) => !ordered.includes(block))
  return [...ordered, ...remainder]
}

export function boardHasConfigPane(def: UniversalBoardDef): boolean {
  return resolveConfigBlockOrder(def).length > 0
}

export function paneBlocksFor(
  def: UniversalBoardDef,
  pane: NavPaneId,
): NavRenderBlock[] {
  if (pane === "universal") {
    return UNIVERSAL_NAV_BLOCKS.filter((block) => {
      if (block === "sessions") return def.nav.sections.sessions === true
      if (block === "stage") return def.boardId === "realm"
      return true
    })
  }
  if (pane === "keepers") return [...KEEPERS_NAV_BLOCKS]
  return resolveConfigBlockOrder(def)
}

export function paneForNavBlock(block: NavRenderBlock): NavPaneId {
  if (CONFIG_BLOCK_SET.has(block)) return "config"
  if (block === "keepers" || block === "journeys") return "keepers"
  return "universal"
}
