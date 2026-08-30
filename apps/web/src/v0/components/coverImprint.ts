/** Cover header imprint — domain name, never the hardcoded platform brand. */
export function resolveCoverImprint(input: {
  isPlaceholder: boolean
  domainName?: string | null
  domainSlug?: string | null
}): string | null {
  if (input.isPlaceholder) return null
  const name = input.domainName?.trim()
  if (name) return name
  const slug = input.domainSlug?.trim()
  return slug || null
}
