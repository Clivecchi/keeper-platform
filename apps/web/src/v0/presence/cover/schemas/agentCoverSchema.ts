/**
 * Layer 2 — Agent EntityKind cover schema.
 * Declares how agent data fills the universal cover slots.
 */

import type {
  CoverAvatarGlow,
  CoverResolveContext,
  CoverActionHandlers,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

function resolveAccent(themeColor?: string): string {
  if (!themeColor?.trim()) return ""
  return themeColor.trim()
}

function statusToGlow(status?: string): CoverAvatarGlow {
  const s = (status ?? "").toLowerCase()
  if (s.includes("error") || s.includes("fail")) return "error"
  if (s.includes("ready") || s.includes("active") || s.includes("live")) return "active"
  return "inactive"
}

function formatRoleLine(
  tagline: string | undefined,
  agentClass: string | undefined,
  purpose: string | undefined,
): string | undefined {
  if (tagline?.trim()) return tagline.trim().toUpperCase()
  if (agentClass?.trim()) {
    const cls = agentClass.trim().toUpperCase()
    return `AS THE ${cls} AGENT`
  }
  if (purpose?.trim()) {
    const short = purpose.trim().slice(0, 64)
    return short.toUpperCase()
  }
  return undefined
}

function formatModelLabel(model?: string): string {
  if (!model?.trim()) return "—"
  const m = model.trim()
  if (m.includes("claude-sonnet-4-6") || m.includes("claude-sonnet-4.6")) return "Sonnet 4.6"
  if (m.includes("claude-opus")) return "Opus"
  if (m.includes("gpt-4o-mini")) return "GPT-4o Mini"
  if (m.includes("gpt-4o")) return "GPT-4o"
  if (m.includes("gpt-4-turbo")) return "GPT-4 Turbo"
  if (m === "gpt-4") return "GPT-4"
  if (m.includes("gpt-3.5")) return "GPT-3.5 Turbo"
  return m.split("/").pop() ?? m
}

function parseCredits(toolsRaw?: string, permissionsRaw?: string): string[] {
  const chips: string[] = []
  const split = (s?: string) =>
    (s ?? "")
      .split(/[,;\n]+/)
      .map((x) => x.trim())
      .filter(Boolean)

  for (const t of split(toolsRaw)) {
    chips.push(t.startsWith("actions.") || t.includes(".") ? t : `actions.${t}`)
  }
  for (const p of split(permissionsRaw)) {
    if (!chips.includes(p)) chips.push(p)
  }
  return chips.slice(0, 8)
}

function frameLabelFromId(objectId: string): string {
  const suffix = objectId.replace(/-/g, "").slice(-3).toUpperCase()
  const num = parseInt(suffix, 16) % 999
  return `FRAME ${String(num + 1).padStart(3, "0")}`
}

function resolveVoiceQuote(fieldValues: Record<string, string>): string | undefined {
  const lens = fieldValues.lensSystemPrompt?.trim()
  if (lens) return lens
  const personality = fieldValues.personality?.trim()
  if (personality) return personality
  const purpose = fieldValues.purpose?.trim()
  if (purpose) return purpose
  return undefined
}

export const agentCoverSchema: EntityCoverSchema = {
  objectType: "agent",

  resolve(
    record,
    fieldValues,
    ctx,
    handlers,
  ): ResolvedCoverContent {
    const name = fieldValues.name?.trim() || "Untitled agent"
    const agentClass =
      typeof record.agent_class === "string" ? record.agent_class : undefined
    const slug = typeof record.slug === "string" ? record.slug : ctx.objectId.slice(0, 8)

    const status = fieldValues.status ?? ""
    const glow = statusToGlow(status)
    const onStage = glow === "active"

    const domainLabel =
      ctx.domainDisplayName?.trim() ||
      ctx.domainSlug?.trim() ||
      "—"

    const statusLabel = status.trim()
      ? status.replace(/^\w/, (c) => c.toUpperCase())
      : "—"

    const traits = [
      { label: "Domain", value: domainLabel },
      { label: "Model", value: formatModelLabel(fieldValues.model) },
      { label: "Status", value: statusLabel, pulse: glow === "active" },
      {
        label: "Visibility",
        value: (fieldValues.visibility ?? "private").replace(/^\w/, (c) => c.toUpperCase()),
      },
    ]

    const permissionsRaw = Array.isArray(record.permissions)
      ? (record.permissions as string[]).join(", ")
      : undefined

    const credits = parseCredits(fieldValues.tools, permissionsRaw)

    const actions = [
      {
        id: "configure",
        label: "Configure",
        variant: "secondary" as const,
        icon: "gear" as const,
        onClick: handlers.onConfigure,
      },
      {
        id: "train",
        label: "Train",
        variant: "primary" as const,
        icon: "play" as const,
        onClick: handlers.onTrain ?? handlers.onOpenSession ?? (() => {}),
      },
    ]

    return {
      hero: {
        avatar: fieldValues.avatar,
        avatarGlow: glow,
        accentColor: resolveAccent(fieldValues.theme_color),
        chromeTitle: `KE3P · AGENT · ${slug.toUpperCase().slice(0, 12)}`,
        statusLabel: onStage ? "ON STAGE" : status.toUpperCase() || undefined,
        frameLabel: frameLabelFromId(ctx.objectId),
        roleLabel: agentClass?.toUpperCase() ?? "AGENT",
      },
      identity: {
        name,
        roleLine: formatRoleLine(fieldValues.tagline, agentClass, fieldValues.purpose),
        voiceQuote: resolveVoiceQuote(fieldValues),
        voicePlaceholder:
          "Give this agent a voice — first person, present tense. What do they say when they walk on stage?",
      },
      traits,
      credits,
      actions,
    }
  },
}

export function resolveAgentCoverContent(
  record: Record<string, unknown>,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return agentCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
