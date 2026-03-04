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
}
