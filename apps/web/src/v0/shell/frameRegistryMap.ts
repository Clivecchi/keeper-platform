/**
 * Core Frame Registry Map
 *
 * All V0 Frames. Imported by V0Shell.tsx to build FRAME_REGISTRY.
 * Also imported by DesignBoardCanvas (boards/designer) to render frame previews.
 */

import type React from "react"
import { CoverFrame } from "../components/cover-frame"
import { MomentFrame } from "../components/moment-frame"
import { KeptMomentsFrame } from "../components/kept-moments-frame"
import { CommonsFrame } from "../frames/commons/CommonsFrame"
import { PresentFrame } from "../frames/present/PresentFrame"
import { DiagnosticsFrame } from "../frames/diagnostics/DiagnosticsFrame"
import { FeedFrame } from "../frames/feed/FeedFrame"
import { KeepersFrame } from "../frames/keepers/KeepersFrame"
import { JourneysFrame } from "../frames/journeys/JourneysFrame"
import { ProfileFrame } from "../frames/profile/ProfileFrame"
import { AgentFrame } from "../frames/agent/AgentFrame"
import { AgentBoardFrame } from "../frames/agent/AgentBoardFrame"
import { AdminFrame } from "../frames/admin/AdminFrame"
import { IndexFrame } from "../frames/index/IndexFrame"
import { ThemeFrame } from "../frames/theme/ThemeFrame"
import { HubFrame } from "../frames/hub/HubFrame"

export const CORE_FRAME_MAP: Record<string, React.ComponentType<any>> = {
  cover: CoverFrame,
  commons: CommonsFrame,
  index: IndexFrame,
  moment: MomentFrame,
  moments: KeptMomentsFrame,
  present: PresentFrame,
  diagnostics: DiagnosticsFrame,
  feed: FeedFrame,
  keepers: KeepersFrame,
  journeys: JourneysFrame,
  profile: ProfileFrame,
  agent: AgentBoardFrame,
  kip: AgentFrame,
  admin: AdminFrame,
  theme: ThemeFrame,
  hub: HubFrame,
}

/** Human-readable display name for each frame key */
export const FRAME_DISPLAY_NAMES: Record<string, string> = {
  cover: "Cover",
  commons: "Commons",
  index: "Index",
  moment: "Moment",
  moments: "Kept Moments",
  present: "Present",
  diagnostics: "Diagnostics",
  feed: "Feed",
  keepers: "Keepers",
  journeys: "Journeys",
  profile: "Profile",
  agent: "Agent Board",
  kip: "Kip",
  admin: "Admin",
  theme: "Theme",
  hub: "Hub",
}

/**
 * Maps a frame registry key to its corresponding key in DomainFrameJson.
 * Null means no domain JSON block governs that frame.
 */
export const FRAME_TO_JSON_KEY: Record<string, string | null> = {
  cover: "cover",
  commons: "commons",
  index: null,
  moment: "moment",
  moments: "kept_moments",
  present: null,
  diagnostics: "diagnostics",
  feed: null,
  keepers: null,
  journeys: "journeys",
  profile: null,
  agent: "agent_board",
  kip: "kip",
  admin: "domain_admin",
  theme: "theme",
  hub: null,
}
