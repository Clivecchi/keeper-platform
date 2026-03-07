/**
 * Default domain frame JSON object.
 *
 * This is the static seed for the "default" domain.
 * It lives here until all six Steps are confirmed working end-to-end,
 * at which point it migrates to the database as a `frame_json` field
 * on the Domain model.
 *
 * Shape: DomainFrameJson (see domain-frame.types.ts)
 * Spec:  Keeper JsonFrame Spec v0.1 · March 2026
 */

import type { DomainFrameJson } from "./domain-frame.types"

export const DEFAULT_DOMAIN_FRAME: DomainFrameJson = {
  domain: "default",
  keeper_type: "platform",

  theme: {
    wordmark: "KE3P",
    tagline: "cryptically designed, wonderfully underfolded",
    background: "/images/keeper-dawn.jpg",
    colors: {
      primary: "#2d6a7f",
      accent: "#b8963e",
      surface: "#fdfaf4",
    },
    fonts: {
      display: "Cormorant Garamond",
      ui: "Outfit",
    },
  },

  kip: {
    agent_id: "kip-default",
    model: "claude-sonnet-4-6",
    visibility: "public",
    greeting: "Hello. What would you like to keep today?",
  },

  audience_roles: ["guest", "keeper", "admin"],

  cover: {
    slide_type: "domain_cover",
    card: {
      type: "journey_invitation",
      available_to: ["guest", "keeper", "admin"],
    },
  },

  forward: {
    label: "Forward",
    destination: "journey/default",
    available_to: ["guest", "keeper", "admin"],
  },

  directions: [
    {
      label: "Journeys",
      frame: "journeys",
      available_to: ["keeper", "admin"],
    },
    {
      label: "Sign In",
      action: "auth.signin",
      available_to: ["guest"],
    },
  ],

  kip_context: {
    guest: "A visitor exploring Keeper for the first time. Warm welcome. Offer Forward.",
    keeper: "An authenticated keeper. Orient to their journeys and moments.",
    admin: "Platform admin. Full context available.",
  },

  interaction_bar: {
    primary: "forward",
    secondary: ["kip"],
    auth: {
      guest: ["sign_in"],
      keeper: [],
      admin: ["settings"],
    },
  },

  agent_board: {
    frame_title: "Agent studio",

    labels: {
      sidebar: {
        drafts: "Drafts",
        journeys: "Journeys",
        keepers: "Keepers",
        sessions: "Sessions",
        journeys_description: "Scope the conversation to a journey",
        keepers_description: "Scope the conversation to a keeper",
      },
      actions: {
        open_cockpit: "Open Cockpit",
        new_session: "New session",
        back_to_commons: "Back to Commons",
        sign_in: "Sign in",
        back_to_dialogue: "Back to dialogue",
        view_drafts: "View drafts",
        agent_diagnostics: "Agent diagnostics",
      },
    },

    messaging: {
      signin: {
        title: "Kip",
        subtitle: "Sign in to chat with Kip",
        body: "Sign in to chat with Kip, the Keeper Platform Lead Agent.",
      },
      empty_states: {
        no_drafts: "No drafts yet",
        no_journeys: "No journeys available",
        no_keepers: "No keepers available",
        no_sessions: "No sessions yet",
        start_conversation: "Start a conversation to begin",
      },
      dialogue: {
        start_prompt: "Say hello to {agent_name} to start the conversation.",
        thinking: "{agent_name} is thinking…",
      },
      errors: {
        unable_to_load: "Unable to load agent",
        not_found: "Agent not found. The Kip agent may not be configured for this domain.",
        session_expired: "Session expired. Please log in again.",
        send_failed: "Failed to send. Please try again.",
      },
    },

    structure: {
      model: {
        provider: "anthropic",
        id: "claude-sonnet-4-6",
      },
      dialogue: {
        user_bubble_color: "#c17a5a",
      },
    },

    theme: {
      source: "domain",
      override_allowed: true,
    },
  },

  kept_moments: {
    labels: {
      frame_title: "Kept Moments",
      frame_subtitle: "Recent moments kept in this domain",
      close_aria_label: "Close kept moments",
      filter_label: "Filter by Journey:",
      filter_all: "All Journeys",
    },
    messaging: {
      loading: "Loading kept moments...",
      missing_domain: "Domain is required to load kept moments.",
      fetch_failed: "Failed to load kept moments.",
      empty: "No kept moments yet.",
      empty_filtered: "No moments in this journey.",
      untitled: "Untitled moment",
      kept_fallback: "Kept",
    },
  },

  moment: {
    labels: {
      frame_title: "Moment Diary",
      close_aria_label: "Close moment",
      bootstrap_error_no_domain: "Domain is required to start a draft.",
      bootstrap_banner_heading: "Draft is taking longer than usual.",
      bootstrap_banner_body: "Keep writing. We will sync as soon as the draft is ready.",
      bootstrap_banner_retry: "Retry",
      bootstrap_banner_start_new: "Start New",
      status_trouble: "Trouble connecting",
      status_preparing: "Preparing...",
      status_saving: "Saving...",
      status_saved: "Saved",
      status_retry: "Retry",
    },
    messaging: {
      writing: {
        placeholder: "Begin writing\u2026",
        preserved: "Your words are being preserved",
        keep_button: "Keep",
        keeping_button: "Keeping...",
        kept_button: "Kept \u2713",
        keep_aria_label: "Keep this moment",
        upload_aria_label: "Upload media",
        kept_label: "kept",
      },
      save_status: {
        kept_forever: "Moment kept forever",
        saving: "Saving...",
        save_failed: "Failed to save. Changes may be lost.",
        keep_failed: "Failed to keep moment.",
      },
      claim: {
        unauthenticated: "Sign in to claim your moment.",
        failed: "Failed to claim moment.",
        heading: "Create your Ke3p Key",
        body: "Save this claim token to attach your moment to an account later.",
        copy_button: "Copy",
        email_button: "Email to self",
        claim_button: "Claim now",
        signin_button: "Sign in",
        signup_button: "Sign up",
        email_subject: "Your Ke3p Key",
      },
      kip: {
        panel_title: "Kip Companion",
        panel_close_aria_label: "Close Kip panel",
        panel_placeholder: "Kip will assist here.",
      },
      feedback_rail: {
        view_in_domain: "View in Domain",
        kip_button: "Kip",
        kip_aria_label: "Kip companion",
      },
      footer: {
        trail_label: "Trail",
        no_activity: "No recent activity",
        index: "Index",
        view_drafts: "View Drafts",
        view_kept: "View Kept",
        back_to_domain: "Back to Domain",
      },
    },
  },

  commons: {
    labels: {
      close_aria_label: "Close commons",
      settings_aria_label: "Open commons settings",
      settings_open_domain: "Open domain settings",
      settings_theme_label: "Theme",
      breadcrumb_journey: "Journey",
      banner_aria_label: "Commons banner",
      sidebar_label: "Commons context",
      workspace_label: "Commons workspace",
      admin_cover_heading: "Cover image",
      admin_cover_description: "Upload a background image for the commons banner.",
      admin_cover_saving: "Saving cover image...",
      admin_cover_saved: "Cover image saved.",
      admin_cover_error_type: "Cover images must be PNG, JPG, or WEBP.",
      admin_cover_error_api: "Cover image could not be saved. Please try again.",
    },
    messaging: {
      errors: {
        load_failed: "Unable to load commons data.",
      },
      feed: {
        eyebrow: "Feed",
        title: "Commons activity",
        description: "A continuous view of what is alive in the commons.",
        empty_title: "No moments yet",
        empty_detail: "New moments will appear here as the commons grows.",
        empty_time: "Just now",
        capture_cta: "Capture a moment",
        default_moment_title: "Moment captured",
        default_moment_detail: "A new moment has been captured.",
        loading: "Loading commons activity...",
      },
      create: {
        eyebrow: "Create",
        title: "Make something in commons",
        description: "Start a journey or capture a moment without leaving the commons.",
        form_eyebrow: "Create",
        form_description: "Complete the form below to contribute to the commons.",
        start_journey: "Start journey",
        capture_moment: "Capture moment",
        domain_loading: "Creation actions are unavailable while the domain is loading.",
      },
      summary: {
        eyebrow: "Summary",
        title: "Commons overview",
        description: "A quick synthesis of what the commons is holding.",
        stat_journeys: "Journeys",
        stat_keepers: "Keepers",
        stat_moments: "Moments",
        stat_members: "Members",
        members_private: "Private",
      },
      entity: {
        not_found_title: "This item could not be found",
        not_found_description: "It may have been removed or is not available.",
        back_button: "Back to feed",
        moment_title_fallback: "Untitled moment",
        moment_body_fallback: "This moment is still forming.",
        title_fallback: "Not found",
      },
      sidebar: {
        journeys_title: "Journeys",
        journeys_description: "Active paths and suggested threads to follow.",
        journeys_empty: "No journeys yet",
        journeys_empty_cta: "Start a new journey to begin",
        journeys_error: "Journeys are unavailable right now.",
        relationships_title: "Relationships",
        relationships_description: "People, keepers, and trusted circles nearby.",
        relationships_error: "Relationships are unavailable right now.",
        keepers_title: "Keepers",
        keepers_description: "Spaces that hold memory for the domain.",
        keepers_empty: "No keepers yet",
        keepers_empty_cta: "Create a keeper to organize memory",
        keepers_error: "Keepers are unavailable right now.",
      },
      roles: {
        default_label: "Member",
        default_summary: "You belong to this commons.",
        name_fallback: "Member",
        avatar_fallback: "U",
      },
      time: {
        recently: "Recently",
        just_now: "Just now",
        minutes_ago: "minutes ago",
        hours_ago: "hours ago",
        days_ago: "days ago",
      },
    },
  },

  journeys: {
    labels: {
      frame_title: "Journeys",
      frame_subtitle: "Active paths and threads in this domain",
      section_heading: "Your Journeys",
      new_button: "New",
      set_active_button: "Set as Active",
      moments_section_heading: "Moments in this Journey",
      active_badge: "Active",
    },
    messaging: {
      empty_states: {
        no_journeys_heading: "No journeys yet",
        no_journeys_body: "Start a new journey from the Commons to begin organizing your moments.",
        no_selection: "Select a journey to view its details and moments.",
        no_moments: "No moments yet. Keep a moment while this journey is active to add it here.",
      },
      errors: {
        failed_to_load: "Failed to load journeys.",
      },
      meta: {
        keeper_prefix: "Keeper: ",
        created_prefix: "Created ",
        kept_prefix: "Kept ",
        untitled_moment: "Untitled moment",
      },
    },
  },
}
