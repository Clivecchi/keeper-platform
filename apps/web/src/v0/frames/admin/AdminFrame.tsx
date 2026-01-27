"use client"

import { X } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"
import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"

export function AdminFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { closeToBoard, domainSlug } = useV0Shell()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const boardId = searchParams.get("boardId")

  React.useEffect(() => {
    if (!domainSlug) return
    navigate(`/d/${domainSlug}/admin`, { replace: true })
  }, [domainSlug, navigate])

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Domain Admin"
      subtitle="Redirecting to the domain admin surface."
      themeSwitcherSlot={<ThemeSwitcher />}
      rightSlot={
        <button
          type="button"
          aria-label="Close admin"
          onClick={closeToBoard}
          className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>
      }
      onClose={closeToBoard}
    >
      <div className="rounded-2xl border border-black/10 bg-white/80 p-6 text-sm text-gray-700 shadow-sm">
        <div className="text-xs uppercase tracking-wide text-gray-500">Redirecting</div>
        <div className="mt-2 text-sm text-gray-700">
          Opening domain admin for {domainSlug || "this domain"}.
        </div>
        <div className="mt-4 text-sm text-gray-700">
          {boardId ? `Domain home board: ${boardId}` : "Domain home board: unresolved"}
        </div>
      </div>
    </DesignFrame>
  )
}
