/**
 * Layer 2 — Capability EntityKind cover schema.
 */

import {
  capabilityChronicleTitle,
  capabilityEnforcementLabel,
  capabilitySourceFile,
  type CapabilityKind,
} from "../../integrationChronicle/capabilityNavUtils"
import type {
  CoverResolveContext,
  CoverActionHandlers,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

export type CapabilityRecord = {
  id: string
  slug: string
  kind: CapabilityKind
  display_label: string | null
  description: string | null
}

function kindAvatarLetter(kind: CapabilityKind): string {
  return kind.charAt(0).toUpperCase()
}

function kindLabel(kind: CapabilityKind): string {
  return kind.charAt(0).toUpperCase() + kind.slice(1)
}

export const capabilityCoverSchema: EntityCoverSchema<CapabilityRecord> = {
  objectType: "capability",

  resolve(record, _fieldValues, ctx, handlers): ResolvedCoverContent {
    const kind = record.kind
    const title = capabilityChronicleTitle(record)

    const traits = [
      { label: "Kind", value: kindLabel(kind) },
      { label: "Enforcement", value: capabilityEnforcementLabel(kind) },
      { label: "Source", value: capabilitySourceFile(kind) },
      { label: "Slug", value: record.slug },
    ]

    const actions = [
      {
        id: "configure",
        label: "Manage",
        variant: "secondary" as const,
        icon: "gear" as const,
        onClick: handlers.onConfigure,
      },
    ]

    return {
      hero: {
        avatar: kindAvatarLetter(kind),
        avatarGlow: kind === "infra" ? "active" : "inactive",
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: `KE3P · CAPABILITY · ${record.slug.toUpperCase().slice(0, 20)}`,
        statusLabel: capabilityEnforcementLabel(kind).toUpperCase(),
        roleLabel: kindLabel(kind).toUpperCase(),
      },
      identity: {
        name: title,
        roleLine: record.slug,
        voiceQuote: record.description?.trim() || undefined,
      },
      traits,
      credits: [],
      actions,
    }
  },
}

export function resolveCapabilityCoverContent(
  record: CapabilityRecord,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return capabilityCoverSchema.resolve(record, {}, ctx, handlers)
}
