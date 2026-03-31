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
  image_style?: string
  image_model?: string
}

export interface DomainFrameCoverCard {
  type: string
  available_to: AudienceRole[]
}

/** Inline / cover-surface chat driven by domain JSON (`cover.chat_interface`). */
export interface DomainFrameCoverChatInterface {
  label?: string
  enabled: boolean
  /** Layout hint for future positioning (e.g. `below_forward`); not used by the UI yet. */
  position?: string
  placeholder?: string
  available_to: AudienceRole[]
  submit_label?: string
}

export interface DomainFrameCover {
  slide_type: string
  card: DomainFrameCoverCard
  chat_interface?: DomainFrameCoverChatInterface
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

export interface CommonsFrameLabels {
  close_aria_label: string
  settings_aria_label: string
  settings_open_domain: string
  settings_theme_label: string
  breadcrumb_journey: string
  banner_aria_label: string
  sidebar_label: string
  workspace_label: string
  admin_cover_heading: string
  admin_cover_description: string
  admin_cover_saving: string
  admin_cover_saved: string
  admin_cover_error_type: string
  admin_cover_error_api: string
}

export interface CommonsFrameMessaging {
  errors: {
    load_failed: string
  }
  feed: {
    eyebrow: string
    title: string
    description: string
    empty_title: string
    empty_detail: string
    empty_time: string
    capture_cta: string
    default_moment_title: string
    default_moment_detail: string
    loading: string
  }
  create: {
    eyebrow: string
    title: string
    description: string
    form_eyebrow: string
    form_description: string
    start_journey: string
    capture_moment: string
    domain_loading: string
  }
  summary: {
    eyebrow: string
    title: string
    description: string
    stat_journeys: string
    stat_keepers: string
    stat_moments: string
    stat_members: string
    members_private: string
  }
  entity: {
    not_found_title: string
    not_found_description: string
    back_button: string
    moment_title_fallback: string
    moment_body_fallback: string
    title_fallback: string
  }
  sidebar: {
    journeys_title: string
    journeys_description: string
    journeys_empty: string
    journeys_empty_cta: string
    journeys_error: string
    relationships_title: string
    relationships_description: string
    relationships_error: string
    keepers_title: string
    keepers_description: string
    keepers_empty: string
    keepers_empty_cta: string
    keepers_error: string
  }
  roles: {
    default_label: string
    default_summary: string
    name_fallback: string
    avatar_fallback: string
  }
  time: {
    recently: string
    just_now: string
    minutes_ago: string
    hours_ago: string
    days_ago: string
  }
}

export interface CommonsFrameJson {
  labels: CommonsFrameLabels
  messaging: CommonsFrameMessaging
}

export interface DomainAdminFrameJson {
  labels: {
    frameTitle: string;
    frameSubtitle: string;
    backToCommons: string;
    noDomainSelected: string;
  };
  messaging: {
    checkingAccess: string;
    loadingDomain: string;
    domainNotFound: string;
    domainNotFoundDetail: string;
    adminRequired: string;
    adminRequiredDetail: string;
  };
  domain_manager: {
    labels: { heading: string; };
    messaging: { description: string; };
  };
  profile: {
    labels: {
      heading: string;
      fullName: string;
      email: string;
      saveButton: string;
      savingButton: string;
    };
    messaging: {
      description: string;
      saveSuccess: string;
      saveError: string;
      saveErrorRetry: string;
    };
  };
  policy: {
    labels: {
      heading: string;
      refreshButton: string;
      saveButton: string;
      savingButton: string;
    };
    messaging: {
      description: string;
      sourceMeta: string;
      loadError: string;
      saveError: string;
      loading: string;
    };
  };
}

export interface DiagnosticsFrameJson {
  labels: {
    frameTitle: string;
    frameSubtitle: string;
    closeAriaLabel: string;
    closeButton: string;
  };
  run_diagnostics: {
    labels: {
      heading: string;
      runButton: string;
      runningButton: string;
      copyButton: string;
      viewDetailedJson: string;
      clearButton: string;
    };
    messaging: {
      description: string;
      copySuccess: string;
      footerNote: string;
    };
  };
  context: {
    labels: {
      heading: string;
      domainSlug: string;
      domainId: string;
      xDomainSlug: string;
      notSet: string;
    };
  };
  domain_home_board: {
    labels: {
      heading: string;
      domainSlug: string;
      endpoint: string;
      stability: string;
      stabilityPass: string;
      stabilityFail: string;
      httpStatus1: string;
      httpStatus2: string;
      boardId: string;
      boardType: string;
      domainId: string;
      frames: string;
      framesDetail: string;
    };
    messaging: {
      description: string;
      authBlocked: string;
      noFrames: string;
      emptyState: string;
    };
  };
  live_progress: {
    labels: {
      heading: string;
    };
  };
  summary: {
    labels: {
      heading: string;
      total: string;
      passed: string;
      failed: string;
      success: string;
    };
  };
  agent_diagnostics: {
    labels: {
      heading: string;
      authStatus: string;
      authAuthenticated: string;
      authGuest: string;
      userId: string;
      domainResolution: string;
      consoleLogs: string;
      networkRequests: string;
    };
    messaging: {
      description: string;
      noConsoleLogs: string;
      noNetworkRequests: string;
    };
  };
  board_error: {
    labels: {
      heading: string;
      reqId: string;
      url: string;
      status: string;
      boardId: string;
      at: string;
    };
  };
  critical_error: {
    labels: {
      heading: string;
    };
  };
}

// ─── Feed ─────────────────────────────────────────────────────────────────────

export interface FeedFrameJson {
  frame_title: string
  frame_subtitle: string
  coming_soon_heading: string
  coming_soon_body: string
  cta_back_to_commons: string
}

// ─── Keepers ──────────────────────────────────────────────────────────────────

export interface KeepersFrameJson {
  frame_title: string
  frame_subtitle: string
  coming_soon_heading: string
  coming_soon_body: string
  cta_back_to_commons: string
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export interface ProfileFrameJson {
  frame_title: string
  frame_subtitle: string
  coming_soon_heading: string
  coming_soon_body: string
  cta_back_to_commons: string
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
  commons: CommonsFrameJson
  diagnostics: DiagnosticsFrameJson
  domain_admin: DomainAdminFrameJson
  feed: FeedFrameJson
  keepers: KeepersFrameJson
  profile: ProfileFrameJson
}
