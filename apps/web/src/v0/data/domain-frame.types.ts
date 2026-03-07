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

export interface KeptMomentsFrameLabels {
  frame_title: string
  frame_subtitle: string
  close_aria_label: string
  filter_label: string
  filter_all: string
}

export interface KeptMomentsFrameMessaging {
  loading: string
  missing_domain: string
  fetch_failed: string
  empty: string
  empty_filtered: string
  untitled: string
  kept_fallback: string
}

export interface KeptMomentsFrame {
  labels: KeptMomentsFrameLabels
  messaging: KeptMomentsFrameMessaging
}

export interface MomentFrameLabels {
  frame_title: string
  close_aria_label: string
  bootstrap_error_no_domain: string
  bootstrap_banner_heading: string
  bootstrap_banner_body: string
  bootstrap_banner_retry: string
  bootstrap_banner_start_new: string
  status_trouble: string
  status_preparing: string
  status_saving: string
  status_saved: string
  status_retry: string
}

export interface MomentFrameMessaging {
  writing: {
    placeholder: string
    preserved: string
    keep_button: string
    keeping_button: string
    kept_button: string
    keep_aria_label: string
    upload_aria_label: string
    kept_label: string
  }
  save_status: {
    kept_forever: string
    saving: string
    save_failed: string
    keep_failed: string
  }
  claim: {
    unauthenticated: string
    failed: string
    heading: string
    body: string
    copy_button: string
    email_button: string
    claim_button: string
    signin_button: string
    signup_button: string
    email_subject: string
  }
  kip: {
    panel_title: string
    panel_close_aria_label: string
    panel_placeholder: string
  }
  feedback_rail: {
    view_in_domain: string
    kip_button: string
    kip_aria_label: string
  }
  footer: {
    trail_label: string
    no_activity: string
    index: string
    view_drafts: string
    view_kept: string
    back_to_domain: string
  }
}

export interface MomentFrameJson {
  labels: MomentFrameLabels
  messaging: MomentFrameMessaging
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
  kept_moments: KeptMomentsFrame
  moment: MomentFrameJson
}
