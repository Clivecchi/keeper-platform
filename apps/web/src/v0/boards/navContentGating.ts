import type { NavPanelDef, NavRenderBlock, NavMode } from "./UniversalBoardDefinition"
import {
  isKeepersAlwaysOnBlock,
  isUniversalAlwaysOnBlock,
} from "./navPanes"

export type { NavMode }

/** Loaded entity counts for content-gated nav (`null` = still fetching). */
export interface NavContentCountSnapshot {
  dialogs: number | null
  journeys: number | null
  keepers: number | null
  drafts: number | null
  agents: number | null
  library: number | null
  chatter: number | null
  connections: number | null
}

const CONTENT_GATED_BLOCKS: NavRenderBlock[] = [
  "dialogs",
  "journeys",
  "keepers",
  "drafts",
  "agents",
  "library",
  "chatter",
  "connections",
]

export function resolveNavMode(nav: NavPanelDef): NavMode {
  return nav.navMode ?? "static"
}

function getBlockContentCount(
  block: NavRenderBlock,
  counts: NavContentCountSnapshot,
): number | null {
  switch (block) {
    case "dialogs":
      return counts.dialogs
    case "journeys":
      return counts.journeys
    case "keepers":
      return counts.keepers
    case "drafts":
      return counts.drafts
    case "agents":
      return counts.agents
    case "library":
      return counts.library
    case "chatter":
      return counts.chatter
    case "connections":
      return counts.connections
    default:
      return null
  }
}

/**
 * When `navMode` is `contentGated`, hide entity nav blocks with zero items unless
 * listed in `navAlwaysShow`. Non-entity blocks and `static` mode always pass.
 * Loading counts (`null`) keep the section visible until fetch completes.
 */
export function shouldRenderContentGatedBlock(
  block: NavRenderBlock,
  nav: NavPanelDef,
  counts: NavContentCountSnapshot,
): boolean {
  if (resolveNavMode(nav) === "static") return true
  if (isUniversalAlwaysOnBlock(block) || isKeepersAlwaysOnBlock(block)) return true
  if (!CONTENT_GATED_BLOCKS.includes(block)) return true
  if (nav.navAlwaysShow?.includes(block)) return true

  const count = getBlockContentCount(block, counts)
  if (count === null) return true
  return count > 0
}
