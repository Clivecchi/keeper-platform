"use client"

import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { DesignFrame } from "../frames/DesignFrame"
import { MomentBody } from "../frames/moment/MomentBody"
import { ThemeSwitcher } from "../frames/ThemeSwitcher"

export function MomentFrame({ styleId = 'neutral', themeSlug, domainSlug }: { styleId?: StyleId, themeSlug?: string | null, domainSlug?: string }) {
  const navigate = useNavigate()

  const handleClose = () => {
    navigate(`/d/${domainSlug || 'default'}`)
  }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Moment Diary"
      subtitle={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close moment"
          onClick={handleClose}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={handleClose}
    >
      <MomentBody themeSlug={themeSlug} domainSlug={domainSlug} />
    </DesignFrame>
  )
}

