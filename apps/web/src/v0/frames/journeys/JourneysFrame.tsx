"use client"

import { X } from "lucide-react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"

export function JourneysFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { closeToBoard } = useV0Shell()

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Journeys"
      subtitle="This frame will host domain journeys inside the v0 shell."
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close journeys"
          onClick={closeToBoard}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={closeToBoard}
    >
      <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-gray-700 shadow-sm">
        Journey surfaces will render here once the v0 domain board data is connected.
      </div>
    </DesignFrame>
  )
}
