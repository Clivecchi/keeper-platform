/**
 * DomainFrame — the single JSON object the Frame reads per domain.
 *
 * One object. Fetched on load. The Frame renders from it. Kip reads it.
 * Nothing else is needed.
 *
 * Shape defined in: Keeper JsonFrame Spec v0.1 · March 2026
 */

export type AudienceRole = "guest" | "keeper" | "admin"

export interface DomainFrameTheme {
  wordmark: string
  tagline: string
  background: string
  colors: {
    primary: string
    accent: string
    surface: string
  }
  fonts: {
    display: string
    ui: string
  }
}

export interface DomainFrameKip {
  agent_id: string
  model: string
  visibility: "public" | "private"
  greeting: string
}

export interface DomainFrameCoverCard {
  type: string
  available_to: AudienceRole[]
}

export interface DomainFrameCover {
  slide_type: string
  card: DomainFrameCoverCard
}

export interface DomainFrameForward {
  label: string
  destination: string
  available_to: AudienceRole[]
}

export interface DomainFrameDirection {
  label: string
  frame?: string
  action?: string
  available_to: AudienceRole[]
}

export interface DomainFrameKipContext {
  guest: string
  keeper: string
  admin: string
}

export interface DomainFrameInteractionBar {
  primary: string
  secondary: string[]
  auth: {
    guest: string[]
    keeper: string[]
    admin: string[]
  }
}

export interface AgentBoardSidebarLabels {
  drafts: string
  journeys: string
  keepers: string
  sessions: string
  journeys_description: string
  keepers_description: string
}

export interface AgentBoardActionLabels {
  open_cockpit: string
  new_session: string
  back_to_commons: string
  sign_in: string
  back_to_dialogue: string
  view_drafts: string
  agent_diagnostics: string
}

export interface AgentBoardLabels {
  sidebar: AgentBoardSidebarLabels
  actions: AgentBoardActionLabels
}

export interface AgentBoardSigninMessaging {
  title: string
  subtitle: string
  body: string
}

export interface AgentBoardEmptyStateMessaging {
  no_drafts: string
  no_journeys: string
  no_keepers: string
  no_sessions: string
  start_conversation: string
}

export interface AgentBoardDialogueMessaging {
  start_prompt: string
  thinking: string
}

export interface AgentBoardErrorMessaging {
  unable_to_load: string
  not_found: string
  session_expired: string
  send_failed: string
}

export interface AgentBoardMessaging {
  signin: AgentBoardSigninMessaging
  empty_states: AgentBoardEmptyStateMessaging
  dialogue: AgentBoardDialogueMessaging
  errors: AgentBoardErrorMessaging
}

export interface AgentBoardStructure {
  model: {
    provider: string
    id: string
  }
  dialogue: {
    user_bubble_color: string
  }
}

export interface AgentBoardThemeRef {
  source: string
  override_allowed: boolean
}

export interface AgentBoardFrame {
  frame_title: string
  labels: AgentBoardLabels
  messaging: AgentBoardMessaging
  structure: AgentBoardStructure
  theme: AgentBoardThemeRef
}

export interface JourneysFrameLabels {
  frame_title: string
  frame_subtitle: string
  section_heading: string
  new_button: string
  set_active_button: string
  moments_section_heading: string
  active_badge: string
}

export interface JourneysFrameMessaging {
  empty_states: {
    no_journeys_heading: string
    no_journeys_body: string
    no_selection: string
    no_moments: string
  }
  errors: {
    failed_to_load: string
  }
  meta: {
    keeper_prefix: string
    created_prefix: string
    kept_prefix: string
    untitled_moment: string
  }
}

export interface JourneysFrame {
  labels: JourneysFrameLabels
  messaging: JourneysFrameMessaging
}

export interface DomainFrameJson {
  domain: string
  keeper_type: string
  theme: DomainFrameTheme
  kip: DomainFrameKip
  audience_roles: AudienceRole[]
  cover: DomainFrameCover
  forward: DomainFrameForward
  directions: DomainFrameDirection[]
  kip_context: DomainFrameKipContext
  interaction_bar: DomainFrameInteractionBar
  agent_board: AgentBoardFrame
  journeys: JourneysFrame
}
