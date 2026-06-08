/**
 * Layer 2 — Key EntityKind cover schema.
 */
import type { EntityCoverSchema } from "../coverTypes"

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
}

function statusGlow(status: string): "active" | "inactive" | "error" {
  if (status === "valid") return "active"
  if (status === "invalid" || status === "revoked") return "error"
  return "inactive"
}

function formatTraitTime(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

export const keyCoverSchema: EntityCoverSchema<KeyRecord> = {
  objectType: "key",
  resolve(record, _fieldValues, _ctx, handlers) {
    const sourceLabel = record.key_source.toUpperCase()
    const traits = [
      { label: "Source", value: sourceLabel },
      { label: "Last verified", value: formatTraitTime(record.last_verified) },
      ...(record.expires_at
        ? [{ label: "Expires", value: formatTraitTime(record.expires_at) }]
        : []),
      { label: "Status", value: record.status },
    ]

    return {
      hero: {
        avatarGlow: statusGlow(record.status),
        accentColor: "hsl(var(--theme-accent-primary))",
        statusLabel: record.status,
        chromeTitle: record.provider,
      },
      identity: {
        name: record.display_label ?? `${record.provider} Key`,
        roleLine: sourceLabel,
        voiceQuote: record.description ?? undefined,
      },
      traits,
      credits: record.scope ? [record.scope] : [],
      actions: [
        {
          id: "verify",
          label: "Verify",
          variant: "primary",
          onClick: handlers.onOpenSession,
        },
        {
          id: "configure",
          label: "Configure",
          variant: "secondary",
          icon: "gear",
          onClick: handlers.onConfigure,
        },
      ],
    }
  },
}
