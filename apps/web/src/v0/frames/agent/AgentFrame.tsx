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

  // DomainFrameKip.agent_id — available, no current render surface (consumed by KipAgentBoard internally)
  // DomainFrameKip.model — available, no current render surface (consumed by KipAgentBoard internally)
  // DomainFrameKip.visibility — available, no current render surface (access control flag, not display text)
  // DomainFrameKip.image_style — available, no current render surface (image generation prompt, not display text)
  // DomainFrameKip.image_model — available, no current render surface (image generation model id, not display text)

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
          className="inline-flex items-center justify-center rounded-sm border border-transparent p-1 shadow-sm backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-[hsl(var(--theme-surface-paper))] hover:border-[hsl(var(--theme-border-soft))] hover:bg-[hsl(var(--theme-hover-surface))] hover:text-[var(--theme-ink-primary-color)]"
          style={{
            color: "var(--theme-ink-tertiary-color)",
            backgroundColor: "hsl(var(--theme-surface-elevated) / 0.92)",
          }}
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={closeToBoard}
    >
      {/* MVP: v0 frame mounts legacy Kip agent surface (not FrameRenderer yet). */}
      <div
        className="rounded-2xl shadow-sm"
        style={{
          border: "1px solid hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.92)",
          boxShadow: "var(--theme-shadow-soft)",
        }}
      >
        <KipAgentBoard />
      </div>
    </DesignFrame>
  )
}
