"use client"

import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { KeptMomentsBody } from "../frames/moment/KeptMomentsBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"

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

  const handleClose = () => {
    if (domainSlug) {
      navigate(`/d/${domainSlug}`)
    } else {
      navigate("/v0")
    }
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Kept Moments"
      subtitle="Recent moments kept in this domain"
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close kept moments"
          onClick={handleClose}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={handleClose}
    >
      <KeptMomentsBody domainSlug={domainSlug} />
    </DesignFrame>
  )
}
