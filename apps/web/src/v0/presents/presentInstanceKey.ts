/** Theatre.js sheet instance ids must be 1–32 characters. */
const MAX_INSTANCE_KEY_LENGTH = 32

/**
 * Stable Present motion instance key from object type + id.
 * UUID-based ids are compacted; domain slugs are preferred when available.
 */
export function toPresentInstanceKey(
  objectType: string,
  objectId: string,
  domainSlug?: string,
): string {
  if (objectType === "domain" && domainSlug?.trim()) {
    return `domain:${domainSlug.trim()}`.slice(0, MAX_INSTANCE_KEY_LENGTH)
  }

  const raw = `${objectType}:${objectId}`
  if (raw.length <= MAX_INSTANCE_KEY_LENGTH) return raw

  const compactId = objectId.replace(/-/g, "")
  const prefix = `${objectType}:`
  const idRoom = MAX_INSTANCE_KEY_LENGTH - prefix.length
  if (idRoom < 1) return raw.slice(0, MAX_INSTANCE_KEY_LENGTH)

  return `${prefix}${compactId.slice(0, idRoom)}`
}
