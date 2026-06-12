/**
 * Layer 2 — Key EntityKind cover schema.
 */
import {
  providerDisplayLabel,
  providerIconLetter,
} from "../../integrationChronicle/keyNavUtils"
import { formatRelativeTime } from "../../integrationChronicle/shared"
import type {
  CoverActionDef,
  CoverResolveContext,
  CoverActionHandlers,
  EntityCoverSchema,
  ResolvedCoverContent,
} from "../coverTypes"

export type KeyRecord = {
  id: string
  provider: string
  key_source: string
  status: string
  scope: string | null
  last_verified: string | null
  expires_at: string | null
  display_label: string | null
  description: string | null
  chronicle_actions?: string[]
  integration_capabilities?: string[]
}

function statusGlow(status: string): "active" | "inactive" | "error" {
  if (status === "valid") return "active"
  if (status === "invalid" || status === "revoked") return "error"
  return "inactive"
}

function mapDisplayStatus(status: string): string {
  if (status === "valid") return "valid"
  if (status === "invalid" || status === "revoked") return "invalid"
  return "missing"
}

function resolveCredits(record: KeyRecord): string[] {
  const chips: string[] = []
  const providerLabel = providerDisplayLabel(record.provider, record.display_label)
  if (record.scope?.trim()) {
    chips.push(record.scope.trim())
  } else {
    chips.push(providerLabel)
  }
  for (const cap of record.integration_capabilities ?? []) {
    const trimmed = cap.trim()
    if (trimmed && !chips.includes(trimmed)) chips.push(trimmed)
  }
  return chips.slice(0, 8)
}

function resolveActions(
  record: KeyRecord,
  handlers: CoverActionHandlers,
): CoverActionDef[] {
  const normalizedStatus = mapDisplayStatus(record.status)
  const actions: CoverActionDef[] = [
    {
      id: "verify",
      label: "Verify Key",
      variant: "primary",
      onClick: handlers.onOpenSession ?? (() => {}),
    },
  ]

  actions.push({
    id: "manage",
    label: normalizedStatus !== "valid" ? "Add Key" : "Manage",
    variant: "secondary",
    icon: normalizedStatus === "valid" ? "gear" : undefined,
    onClick: handlers.onConfigure,
  })

  return actions
}

export const keyCoverSchema: EntityCoverSchema<KeyRecord> = {
  objectType: "key",
  resolve(record, _fieldValues, _ctx, handlers) {
    const sourceLabel = record.key_source.toUpperCase()
    const displayStatus = mapDisplayStatus(record.status)
    const traits = [
      { label: "Status", value: displayStatus },
      { label: "Last verified", value: formatRelativeTime(record.last_verified ?? undefined) },
      { label: "Source", value: sourceLabel },
      ...(record.expires_at
        ? [{ label: "Expires", value: formatRelativeTime(record.expires_at) }]
        : []),
    ]

    return {
      hero: {
        avatar: providerIconLetter(record.provider),
        avatarGlow: statusGlow(record.status),
        accentColor: "hsl(var(--theme-accent-primary))",
        chromeTitle: providerDisplayLabel(record.provider, record.display_label),
        statusLabel: displayStatus.toUpperCase(),
        roleLabel: sourceLabel,
      },
      identity: {
        name: record.display_label ?? `${record.provider} Key`,
        roleLine: providerDisplayLabel(record.provider),
        voiceQuote: record.description ?? undefined,
      },
      traits,
      credits: resolveCredits(record),
      actions: resolveActions(record, handlers),
    }
  },
}

export function resolveKeyCoverContent(
  record: KeyRecord,
  fieldValues: Record<string, string>,
  ctx: CoverResolveContext,
  handlers: CoverActionHandlers,
): ResolvedCoverContent {
  return keyCoverSchema.resolve(record, fieldValues, ctx, handlers)
}
