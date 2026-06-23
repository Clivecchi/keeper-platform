const ACTIVE_JOURNEY_PREFIX = "keeper-mobile-active-journey:";
const HAS_KEPT_MOMENT_KEY = "keeper-mobile-has-kept-moment";

export function readActiveJourneyId(domainSlug: string): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(`${ACTIVE_JOURNEY_PREFIX}${domainSlug}`);
  } catch {
    return null;
  }
}

export function writeActiveJourneyId(domainSlug: string, journeyId: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(`${ACTIVE_JOURNEY_PREFIX}${domainSlug}`, journeyId);
  } catch {
    /* ignore */
  }
}

export function readHasKeptMoment(): boolean {
  if (typeof localStorage === "undefined") return false;
  try {
    return localStorage.getItem(HAS_KEPT_MOMENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHasKeptMoment(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(HAS_KEPT_MOMENT_KEY, "1");
  } catch {
    /* ignore */
  }
}
