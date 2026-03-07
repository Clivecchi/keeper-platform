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
