/** Fixed light ink on dark picker panel — avoids board theme var mismatch. */
export const SWITCHER_INK_PRIMARY = "hsl(40 14% 96%)"
export const SWITCHER_INK_SECONDARY = "hsl(40 10% 84%)"
export const SWITCHER_INK_MUTED = "hsl(40 8% 72%)"

/** Match PlaybillHeaderCard width — dropdown aligns with the anchor card. */
export const PLAYBILL_ANCHOR_MAX_WIDTH = "min(520px, 58vw)" as const

/** Narrow viewports — leave room for avatar; avoid 58vw truncation. */
export const PLAYBILL_ANCHOR_MAX_WIDTH_MOBILE = "min(100%, calc(100vw - 4.5rem))" as const

/** Visual tokens for anchored Playbill dropdown panels (position via CSS class). */
export const SWITCHER_PANEL_STYLE = {
  border: "0.5px solid hsla(38, 20%, 28%, 0.55)",
  backgroundColor: "hsla(28, 12%, 11%, 0.98)",
  backdropFilter: "blur(10px)",
  boxShadow:
    "0 8px 24px rgba(0, 0, 0, 0.28), 0 2px 6px rgba(0, 0, 0, 0.16)",
} as const
