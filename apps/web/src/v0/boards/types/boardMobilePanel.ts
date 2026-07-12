/** Which Universal Board panel is focused on narrow mobile layouts. */
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
