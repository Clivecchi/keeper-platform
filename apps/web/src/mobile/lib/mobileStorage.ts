const HAS_KEPT_MOMENT_KEY = "keeper-mobile-has-kept-moment";

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
