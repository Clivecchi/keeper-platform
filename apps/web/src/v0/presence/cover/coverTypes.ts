/**
 * Universal Cover architecture — Layer 1 slot structure.
 * Every EntityKind cover shares these five fixed slots.
 */

export type CoverSlotName = "hero" | "identity" | "traits" | "credits" | "actions"

/** Theatre.js handoff names — do not rename. */
export interface CoverMotionValues {
  atmosphereOpacity: number
  nameReveal: number
  statusPulse: number
  heroEntrance: number
}

export type CoverAvatarGlow = "active" | "inactive" | "error"

export interface CoverHeroContent {
  avatar?: string
  avatarGlow: CoverAvatarGlow
  accentColor: string
  chromeTitle?: string
  statusLabel?: string
  frameLabel?: string
  roleLabel?: string
}

export interface CoverIdentityContent {
  name: string
  roleLine?: string
  voiceQuote?: string
  voicePlaceholder?: string
}

export interface CoverTraitItem {
  label: string
  value: string
  /** e.g. memory indicator dot */
  pulse?: boolean
}

export interface CoverActionDef {
  id: string
  label: string
  variant: "primary" | "secondary"
  icon?: "play" | "gear"
  onClick: () => void
}

/** Resolved slot payloads — Layer 2 schemas produce this shape. */
export interface ResolvedCoverContent {
  hero: CoverHeroContent
  identity: CoverIdentityContent
  traits: CoverTraitItem[]
  credits: string[]
  actions: CoverActionDef[]
}

export interface CoverResolveContext {
  domainSlug?: string
  domainDisplayName?: string
  objectId: string
}

/** Layer 2 — EntityKind cover schema pattern. */
export interface EntityCoverSchema<TRecord = Record<string, unknown>> {
  objectType: string
  resolve: (
    record: TRecord,
    fieldValues: Record<string, string>,
    ctx: CoverResolveContext,
    handlers: CoverActionHandlers,
  ) => ResolvedCoverContent
}

export interface CoverActionHandlers {
  onConfigure: () => void
  onOpenSession: () => void
}

export type AgentCoverMode = "cover" | "config"
