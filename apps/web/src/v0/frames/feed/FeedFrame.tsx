"use client"

import { X } from "lucide-react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"

export function FeedFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { closeToBoard, experienceActions } = useV0Shell()

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Domain Feed"
      subtitle="Activity from across the commons"
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close feed"
          onClick={closeToBoard}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={closeToBoard}
    >
      <div className="rounded-2xl border p-6 text-sm shadow-sm" style={{ borderColor: "var(--theme-border-soft)", backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)", color: "var(--theme-ink-secondary)" }}>
        <p className="font-medium mb-2" style={{ color: "var(--theme-ink-primary)" }}>Coming soon</p>
        <p>The domain feed is being prepared. Return to the commons to explore what is available now.</p>
        <button type="button" onClick={experienceActions.goCommons} className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90" style={{ borderColor: "var(--theme-border-soft)", backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)", color: "var(--theme-ink-primary)" }}>
          Back to Commons
        </button>
      </div>
    </DesignFrame>
  )
}
