/**
 * Core Frame Registry Map
 *
 * All V0 Frames except DesignerFrame — exported separately to avoid the
 * circular-import that would occur if DesignerFrame (which renders previews)
 * imported from V0Shell (which imports DesignerFrame).
 *
 * V0Shell.tsx builds FRAME_REGISTRY by spreading this map and adding designer.
 * DesignerFramePreview imports this map directly to render preview frames.
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
  designer: "Designer",
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
  designer: null,
}
