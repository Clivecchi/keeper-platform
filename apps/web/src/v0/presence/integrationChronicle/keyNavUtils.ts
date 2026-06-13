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

/** Chronicle cover title — matches keyCoverSchema identity.name. */
export function keyChronicleTitle(
  key: Pick<KeyNavRow, "provider" | "display_label">,
): string {
  const trimmed = key.display_label?.trim()
  if (trimmed) return trimmed
  return `${key.provider} Key`
}

export function providerDisplayLabel(provider: string, displayLabel?: string | null): string {
  return displayLabel?.trim() || PROVIDER_LABELS[provider] || provider
}

/** @deprecated Use keyChronicleTitle — kept for callers that need provider-only nav labels. */
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

function keySourceRank(keySource: string): number {
  if (keySource === "env") return 0
  if (keySource === "user") return 1
  if (keySource === "platform") return 2
  return 3
}

/** Pick one Key row per provider — prefers active chronicle key, else env → user → platform. */
export function pickKeyRowForProvider(
  rows: KeyNavRow[],
  provider: string,
  preferredKeyId?: string | null,
): KeyNavRow | undefined {
  const providerRows = rows.filter(
    (row) => row.provider === provider && row.status !== "revoked",
  )
  if (providerRows.length === 0) return undefined

  if (preferredKeyId) {
    const preferred = providerRows.find((row) => row.id === preferredKeyId)
    if (preferred) return preferred
  }

  return [...providerRows].sort(
    (a, b) => keySourceRank(a.key_source) - keySourceRank(b.key_source),
  )[0]
}

/** Collapse domain Key rows to one nav row per IDE AI provider. */
export function collapseKeyNavRows(
  rows: KeyNavRow[],
  preferredKeyId?: string | null,
): KeyNavRow[] {
  return IDE_AI_PROVIDERS.map((provider) =>
    pickKeyRowForProvider(rows, provider, preferredKeyId),
  ).filter((row): row is KeyNavRow => row != null)
}

/** Fetch all non-revoked Key rows for a domain (after optional provider sync). */
export async function fetchAllDomainKeyRows(domainId: string): Promise<KeyNavRow[]> {
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
  return rows.filter((row) => row.status !== "revoked")
}

/** Sync + list Key presence rows for IDE AI providers in the active domain. */
export async function fetchDomainKeyNavRows(
  domainId: string,
  options?: { preferredKeyId?: string | null },
): Promise<KeyNavRow[]> {
  const rows = await fetchAllDomainKeyRows(domainId)
  return collapseKeyNavRows(rows, options?.preferredKeyId)
}

export async function fetchProviderKeyId(
  domainId: string,
  provider: string,
  preferredKeyId?: string | null,
): Promise<string | null> {
  const normalized = provider.trim()
  if (!domainId || !normalized) return null

  const keys = (await apiFetch(
    `/api/keys?domainId=${encodeURIComponent(domainId)}&provider=${encodeURIComponent(normalized)}&sync=1`,
  )) as KeyNavRow[]

  if (!Array.isArray(keys) || keys.length === 0) return null

  const active = keys.filter((k) => k.status !== "revoked")
  const picked = pickKeyRowForProvider(active, normalized, preferredKeyId)
  return picked?.id ?? null
}
