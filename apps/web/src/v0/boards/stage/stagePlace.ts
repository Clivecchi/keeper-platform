/**
 * The place a person entered, in human words.
 * Home stays Home even when an anchor Domain supplies the data.
 */

export function resolveEnteredPlaceName(input: {
  shellMode: string | null | undefined
  homeDisplayName?: string | null
  domainName?: string | null
}): string {
  if (input.shellMode === "home") {
    const home = input.homeDisplayName?.trim()
    return home || "Home"
  }
  const domain = input.domainName?.trim()
  return domain || "This place"
}
