import { apiFetch } from "../../../lib/apiFetch"

export type KeyNavRow = {
  id: string
  provider: string
  key_source: string
  status: string
  display_label: string | null
}

export const IDE_AI_PROVIDERS = [
  "anthropic",
  "openai",
  "together-ai",
  "elevenlabs",
] as const

const PROVIDER_LABELS: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  "together-ai": "Together AI",
  elevenlabs: "ElevenLabs",
}

export function providerDisplayLabel(provider: string, displayLabel?: string | null): string {
  return displayLabel?.trim() || PROVIDER_LABELS[provider] || provider
}

/** Nav label — full provider name from Key record (e.g. "Anthropic Key" → "Anthropic"). */
export function keyNavLabel(key: KeyNavRow): string {
  const fromRecord = key.display_label?.trim()
  if (fromRecord) {
    const stripped = fromRecord.replace(/\s+Key$/i, "").trim()
    if (stripped.length > 1) return stripped
  }
  return PROVIDER_LABELS[key.provider] || key.provider
}

export function providerIconLetter(provider: string): string {
  if (provider === "together-ai") return "T"
  return (PROVIDER_LABELS[provider] ?? provider).charAt(0).toUpperCase()
}

export function keyStatusNavHint(status: string): "valid" | "warning" | "error" {
  if (status === "valid") return "valid"
  if (status === "invalid" || status === "revoked") return "error"
  return "warning"
}

/** Sync + list Key presence rows for IDE AI providers in the active domain. */
export async function fetchDomainKeyNavRows(domainId: string): Promise<KeyNavRow[]> {
  await Promise.all(
    IDE_AI_PROVIDERS.map((provider) =>
      apiFetch(
        `/api/keys?domainId=${encodeURIComponent(domainId)}&provider=${encodeURIComponent(provider)}&sync=1`,
      ).catch(() => null),
    ),
  )

  const rows = (await apiFetch(
    `/api/keys?domainId=${encodeURIComponent(domainId)}`,
  )) as KeyNavRow[]

  if (!Array.isArray(rows)) return []

  const byProvider = new Map<string, KeyNavRow>()
  for (const row of rows) {
    if (row.status === "revoked") continue
    const existing = byProvider.get(row.provider)
    if (!existing) {
      byProvider.set(row.provider, row)
      continue
    }
    const rank = (r: KeyNavRow) =>
      r.key_source === "env" ? 0 : r.key_source === "user" ? 1 : r.key_source === "platform" ? 2 : 3
    if (rank(row) < rank(existing)) {
      byProvider.set(row.provider, row)
    }
  }

  return IDE_AI_PROVIDERS.map((provider) => byProvider.get(provider)).filter(
    (row): row is KeyNavRow => row != null,
  )
}

export async function fetchProviderKeyId(
  domainId: string,
  provider: string,
): Promise<string | null> {
  const normalized = provider.trim()
  if (!domainId || !normalized) return null

  const keys = (await apiFetch(
    `/api/keys?domainId=${encodeURIComponent(domainId)}&provider=${encodeURIComponent(normalized)}&sync=1`,
  )) as KeyNavRow[]

  if (!Array.isArray(keys) || keys.length === 0) return null

  const preferred =
    keys.find((k) => k.key_source === "env" && k.status !== "revoked") ??
    keys.find((k) => k.key_source === "user" && k.status !== "revoked") ??
    keys.find((k) => k.key_source === "platform" && k.status !== "revoked") ??
    keys.find((k) => k.status !== "revoked") ??
    keys[0]

  return preferred?.id ?? null
}
