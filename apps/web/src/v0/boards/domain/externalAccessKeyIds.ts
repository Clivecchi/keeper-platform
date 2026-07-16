/** Chronicle selection id for the External Access overview (all MCP keys). */
export const EXTERNAL_ACCESS_OVERVIEW_ID = "external-access"

const DAK_PREFIX = "dak:"

/** Map a domain access key row id to Chronicle `selectedKeyId`. */
export function domainAccessKeyChronicleId(keyId: string): string {
  return `${DAK_PREFIX}${keyId}`
}

/** Parse Chronicle key id — returns raw key id or null if not a domain access key. */
export function parseDomainAccessKeyChronicleId(chronicleId: string): string | null {
  if (!chronicleId.startsWith(DAK_PREFIX)) return null
  const id = chronicleId.slice(DAK_PREFIX.length).trim()
  return id.length > 0 ? id : null
}

export function isExternalAccessChronicleKey(chronicleId: string): boolean {
  return (
    chronicleId === EXTERNAL_ACCESS_OVERVIEW_ID ||
    chronicleId.startsWith(DAK_PREFIX)
  )
}
