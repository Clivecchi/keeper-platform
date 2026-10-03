import type { WhereWeAreClaim, WhereWeAreReading } from "@keeper/shared"

/** How a stored claim is said. The resolver does not own this wording. */
export function whereWeAreClaimLine(claim: WhereWeAreClaim): string {
  const title = claim.title.trim() || "This Dialog"
  switch (claim.kind) {
    case "kept-orientation":
      return `${title} has the kept Orientation.`
    case "cleared-orientation-with-forward":
      return `${title} had its Orientation cleared and retains an authored Forward.`
    case "recent-kept-dialog":
      return `${title} is the most recently kept named Dialog.`
    default: {
      const _exhaustive: never = claim.kind
      return _exhaustive
    }
  }
}

/** Absent when the claims already name a single place. */
export function whereWeAreUncertainty(reading: WhereWeAreReading): string | null {
  if (reading.places.length === 1) return null
  return "The trail does not currently resolve to one place."
}
