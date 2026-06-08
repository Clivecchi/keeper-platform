import { apiFetch } from "../../../lib/apiFetch"

type KeyListRow = { id: string; key_source: string }

/** Resolve the Key EntityKind id for a provider in the active domain. */
export async function fetchProviderKeyId(
  domainId: string,
  provider: string,
): Promise<string | null> {
  const normalized = provider.trim()
  if (!domainId || !normalized) return null

  const keys = (await apiFetch(
    `/api/keys?domainId=${encodeURIComponent(domainId)}&provider=${encodeURIComponent(normalized)}&sync=1`,
  )) as KeyListRow[]

  if (!Array.isArray(keys) || keys.length === 0) return null

  const preferred =
    keys.find((k) => k.key_source === "env") ??
    keys.find((k) => k.key_source === "user") ??
    keys.find((k) => k.key_source === "platform") ??
    keys[0]

  return preferred?.id ?? null
}

/** Chronicle action handler — fetch provider key then navigate via onKeySelect. */
export function buildManageKeysHandler(params: {
  domainId: string
  provider: string
  onKeySelect?: (keyId: string) => void
  openConfigMode?: () => void
}): () => void {
  return () => {
    void (async () => {
      if (!params.onKeySelect) {
        params.openConfigMode?.()
        return
      }
      try {
        const keyId = await fetchProviderKeyId(params.domainId, params.provider)
        if (keyId) {
          params.onKeySelect(keyId)
          return
        }
      } catch {
        /* fall through to config mode */
      }
      params.openConfigMode?.()
    })()
  }
}
