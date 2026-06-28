/** Fixed light ink on dark picker panel — avoids board theme var mismatch. */
export const SWITCHER_INK_PRIMARY = "hsl(40 14% 96%)"
export const SWITCHER_INK_SECONDARY = "hsl(40 10% 84%)"
export const SWITCHER_INK_MUTED = "hsl(40 8% 72%)"

export const SWITCHER_PANEL_STYLE = {
  top: 72,
  left: 0,
  border: "1px solid hsl(var(--theme-border-soft))",
  backgroundColor: "hsl(220 16% 11% / 0.98)",
  backdropFilter: "blur(10px)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.2)",
} as const
