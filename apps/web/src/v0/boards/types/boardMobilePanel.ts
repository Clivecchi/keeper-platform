/**
 * Legacy three-tab ids for `BoardMobilePanelBar`.
 * Adaptive Domain/Realm mobile (≤767px) no longer uses the bottom tab bar —
 * Dialog is always primary; Nav = drawer; Chronicle = strip + overlay.
 * Kept for type compatibility / possible non-adaptive callers.
 */
export type BoardMobilePanelId = "nav" | "dialog" | "chronicle"

export const BOARD_MOBILE_PANEL_IDS: BoardMobilePanelId[] = [
  "nav",
  "dialog",
  "chronicle",
]

export const BOARD_MOBILE_PANEL_LABELS: Record<BoardMobilePanelId, string> = {
  nav: "Nav",
  dialog: "Dialog",
  chronicle: "Chronicle",
}
