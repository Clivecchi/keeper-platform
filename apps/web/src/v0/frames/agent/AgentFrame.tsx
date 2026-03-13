"use client"

import { X } from "lucide-react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"
import { KipAgentBoard } from "../../../pages/kip/KipAgentBoardPage"
import { DEFAULT_DOMAIN_FRAME } from "../../data/domain-frame.default"

export function AgentFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { closeToBoard, domainFrame } = useV0Shell()
  const kipLabels = domainFrame?.kip ?? DEFAULT_DOMAIN_FRAME.kip

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Kip"
      subtitle={kipLabels.greeting}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close Kip"
          onClick={closeToBoard}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={closeToBoard}
    >
      {/* MVP: v0 frame mounts legacy Kip agent surface (not FrameRenderer yet). */}
      <div className="rounded-2xl border border-black/5 bg-white/80 shadow-sm">
        <KipAgentBoard />
      </div>
    </DesignFrame>
  )
}
