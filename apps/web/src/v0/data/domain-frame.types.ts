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
}
