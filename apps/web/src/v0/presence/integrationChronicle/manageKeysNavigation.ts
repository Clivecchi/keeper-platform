import { fetchProviderKeyId } from "./keyNavUtils"

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
        // sync=1 materializes a stub — retry once if the first response was empty
        const retryId = await fetchProviderKeyId(params.domainId, params.provider)
        if (retryId) params.onKeySelect(retryId)
      } catch {
        /* navigation requires a Key record — sync=1 should have created one */
      }
    })()
  }
}
