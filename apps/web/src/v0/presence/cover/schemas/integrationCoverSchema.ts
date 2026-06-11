/**
 * Layer 2 — Integration (service) EntityKind cover schema.
 */
import type { AIModelFeedData } from "../../integrationChronicle/feeds/AIModelFeed"
import type { GlowState, ServiceAction, ServiceConfig } from "../../integrationChronicle/serviceConfig"
import {
  formatConnectedAt,
  type IntegrationDto,
  type IntegrationType,
} from "../../integrationChronicle/shared"
import type {
  CoverActionDef,
  CoverAvatarGlow,
  CoverResolveContext,
  ResolvedCoverContent,
} from "../coverTypes"

const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  Services: "OAuth service",
  Custom: "Custom token",
  AI_Model: "AI model",
}

function serviceIconLetter(label: string): string {
  return label.trim().charAt(0).toUpperCase() || "◇"
}

function glowToAvatarGlow(glow: GlowState): CoverAvatarGlow {
  if (glow === "healthy") return "active"
  if (glow === "degraded") return "error"
  return "inactive"
}

function glowHealthLabel(glow: GlowState): string {
  if (glow === "healthy") return "Healthy"
  if (glow === "building") return "Building"
  if (glow === "degraded") return "Degraded"
  return "Muted"
}

function healthLayerSummary(integration: IntegrationDto | null): string | undefined {
  const layers = integration?.health
  if (!layers?.length) return undefined
  const live = layers.filter((l) => l.status === "live").length
  if (live === layers.length) return "All layers live"
  const degraded = layers.find((l) => l.status === "degraded")
  if (degraded) return `${degraded.label} degraded`
  return `${live}/${layers.length} layers live`
}

function toCoverActions(
  actions: ServiceAction[],
  integrationType: IntegrationType,
  onConfigure: () => void,
): CoverActionDef[] {
  const mapped: CoverActionDef[] = actions.map((action, index) => ({
    id: action.label.toLowerCase().replace(/\s+/g, "_"),
    label: action.label,
    variant: index === 0 ? "primary" : "secondary",
    onClick: action.onClick,
  }))

  if (
    integrationType === "AI_Model" &&
    !mapped.some((action) => action.label === "Configure")
  ) {
    mapped.push({
      id: "configure",
      label: "Configure",
      variant: "secondary",
      icon: "gear",
      onClick: onConfigure,
    })
  }

  return mapped
}

export type IntegrationCoverResolveParams = {
  serviceSlug: string
  integration: IntegrationDto | null
  integrationType: IntegrationType
  config: ServiceConfig<unknown>
  feedData: unknown
  capabilities: string[]
  connected: boolean
  resolvedActions: ServiceAction[]
  onConfigure: () => void
  onConnect: () => void
}

export function resolveIntegrationCoverContent(
  params: IntegrationCoverResolveParams,
  _ctx: CoverResolveContext,
): ResolvedCoverContent {
  const {
    integration,
    integrationType,
    config,
    feedData,
    capabilities,
    connected,
    resolvedActions,
    onConfigure,
    onConnect,
  } = params

  const glow = connected ? config.glowFn(feedData) : ("muted" as GlowState)
  const displayLabel = integration?.display_label ?? config.label
  const description =
    integration?.description?.trim() || config.connectCopy?.trim() || undefined

  const aiData =
    feedData && typeof feedData === "object" && "keyHealth" in feedData
      ? (feedData as AIModelFeedData)
      : null

  const traits: ResolvedCoverContent["traits"] = []

  traits.push({
    label: "Connected",
    value: integration?.connectedAt
      ? formatConnectedAt(integration.connectedAt)
      : connected
        ? "Yes"
        : "Not connected",
  })

  if (integrationType === "AI_Model" && aiData?.keyHealth?.source) {
    traits.push({
      label: "Key source",
      value: aiData.keyHealth.source.toUpperCase(),
    })
  }

  if (integration?.is_gateway) {
    traits.push({ label: "Gateway", value: "Open catalog" })
  }

  const healthSummary = healthLayerSummary(integration)
  traits.push({
    label: "Health",
    value: healthSummary ?? glowHealthLabel(glow),
    pulse: glow === "healthy",
  })

  const coverActions = connected
    ? toCoverActions(resolvedActions, integrationType, onConfigure)
    : [
        {
          id: "connect",
          label: `Connect ${displayLabel}`,
          variant: "primary" as const,
          onClick: onConnect,
        },
      ]

  return {
    hero: {
      avatar: serviceIconLetter(config.label),
      avatarGlow: glowToAvatarGlow(glow),
      accentColor: "hsl(var(--theme-accent-primary))",
      chromeTitle: config.label.toUpperCase(),
      statusLabel: connected ? glowHealthLabel(glow).toUpperCase() : "NOT CONNECTED",
      roleLabel: config.heroSubtitle(feedData),
    },
    identity: {
      name: displayLabel,
      roleLine: INTEGRATION_TYPE_LABELS[integrationType],
      voiceQuote: description,
    },
    traits: traits.slice(0, 4),
    credits: capabilities.slice(0, 8),
    actions: coverActions,
  }
}
