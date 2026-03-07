"use client"

import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { KeptMomentsBody, type KeptMomentsLabels } from "../frames/moment/KeptMomentsBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"
import { useV0ShellOptional } from "../shell/V0ShellContext"

export function KeptMomentsFrame({
  styleId = "neutral",
  themeSlug,
  domainSlug
}: {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string
}) {
  const navigate = useNavigate()
  const v0Shell = useV0ShellOptional()
  const km = v0Shell?.domainFrame?.kept_moments

  const labels: KeptMomentsLabels = {
    loading:       km?.messaging.loading        ?? "Loading kept moments...",
    missingDomain: km?.messaging.missing_domain ?? "Domain is required to load kept moments.",
    fetchFailed:   km?.messaging.fetch_failed   ?? "Failed to load kept moments.",
    empty:         km?.messaging.empty          ?? "No kept moments yet.",
    filterLabel:   km?.labels.filter_label      ?? "Filter by Journey:",
    filterAll:     km?.labels.filter_all        ?? "All Journeys",
    emptyFiltered: km?.messaging.empty_filtered ?? "No moments in this journey.",
    untitled:      km?.messaging.untitled       ?? "Untitled moment",
    keptFallback:  km?.messaging.kept_fallback  ?? "Kept",
  }

  const handleClose = () => {
    if (v0Shell) {
      v0Shell.closeToBoard()
      return
    }
    if (domainSlug) {
      navigate(`/d/${domainSlug}/board`)
      return
    }
    navigate("/v0")
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title={km?.labels.frame_title ?? "Kept Moments"}
      subtitle={km?.labels.frame_subtitle ?? "Recent moments kept in this domain"}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label={km?.labels.close_aria_label ?? "Close kept moments"}
          onClick={handleClose}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={handleClose}
    >
      <KeptMomentsBody domainSlug={domainSlug} labels={labels} />
    </DesignFrame>
  )
}
