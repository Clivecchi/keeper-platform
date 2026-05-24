/**
 * frameCatalog
 * Static frame lists for board nav and Chronicle — not designer-board-specific.
 */

export type FrameItem = {
  key: string
  name: string
  dotColor: string
  badge: "default" | "primary" | "panel"
}

export const BOARD_FRAMES: Record<string, FrameItem[]> = {
  domain: [
    { key: "cover", name: "Board Cover", dotColor: "#7F77DD", badge: "default" },
    { key: "feed", name: "Feed Frame", dotColor: "#1D9E75", badge: "primary" },
    { key: "journeys", name: "Journeys Frame", dotColor: "#378ADD", badge: "panel" },
    { key: "keepers", name: "Keepers Frame", dotColor: "#BA7517", badge: "panel" },
    { key: "moments", name: "Moments Frame", dotColor: "#D4537E", badge: "panel" },
  ],
  design: [],
  "keeper-starter": [],
}

export const BOARD_NAMES: Record<string, string> = {
  domain: "Domain Board",
  design: "Design Board",
  "keeper-starter": "Keeper Starter",
}
