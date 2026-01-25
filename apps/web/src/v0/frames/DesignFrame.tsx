"use client"

import type React from "react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Settings } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { StyleScope } from "../styles/StyleScope"
import { Margin, V0_MARGIN_HEIGHT } from "../components/Margin"
import { useAuth } from "../../context/AuthContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { apiFetch } from "../../lib/api"

interface DesignFrameProps {
  /** Frame style identifier */
  styleId?: StyleId
  /** Theme slug for theming */
  themeSlug?: string | null
  /** Title displayed in header */
  title?: string
  /** Subtitle displayed in header */
  subtitle?: string
  /** Content for top-right control area */
  rightSlot?: React.ReactNode
  /** Theme switcher component */
  themeSwitcherSlot?: React.ReactNode
  /** Main content area */
  children: React.ReactNode
  /** Optional footer content */
  footerSlot?: React.ReactNode
  /** Close handler */
  onClose?: () => void
}

const FRAME_CONSTANTS = {
  pad: "clamp(1.5rem, 5vw, 3.25rem)",
  headerGap: "clamp(1rem, 2vw, 1.5rem)",
  titleSize: "clamp(1.5rem, 4vw, 2rem)",
  subtitleSize: "clamp(0.875rem, 2vw, 1rem)",
}

export function DesignFrame({
  styleId = 'neutral',
  themeSlug,
  title,
  subtitle,
  rightSlot,
  themeSwitcherSlot,
  children,
  footerSlot,
  onClose
}: DesignFrameProps) {
  const { isAuthenticated } = useAuth()
  const v0Shell = useV0ShellOptional()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpeningAdmin, setIsOpeningAdmin] = useState(false)

  const handleOpenAdmin = async () => {
    if (!v0Shell?.domainSlug || isOpeningAdmin) return
    setIsOpeningAdmin(true)
    let boardId: string | null = null

    try {
      const response = await apiFetch(`/api/domains/by-slug/${v0Shell.domainSlug}/home-board`)
      const payload = response?.data ?? response?.board ?? response
      if (typeof payload?.id === "string") {
        boardId = payload.id
      }
    } catch (error) {
      console.warn("[DesignFrame] Failed to resolve domain home board id", error)
    }

    const params = new URLSearchParams()
    const existing = new URLSearchParams(location.search)
    const theme = existing.get("theme")
    const style = existing.get("style")
    if (theme) params.set("theme", theme)
    if (style) params.set("style", style)
    params.set("frame", "admin")
    if (boardId) params.set("boardId", boardId)

    navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
    setIsOpeningAdmin(false)
  }

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <main
        className="min-h-screen text-foreground"
        style={{
          backgroundColor: "var(--theme-surface-page)",
          color: "var(--theme-ink-primary)",
          ["--v0-margin-height" as any]: V0_MARGIN_HEIGHT,
        }}
      >
        <div
          className="mx-auto w-full max-w-5xl"
          style={{
            padding: FRAME_CONSTANTS.pad,
            paddingBottom: `calc(${FRAME_CONSTANTS.pad} + var(--v0-margin-height))`,
          }}
        >
          {/* Header area */}
          {(title || subtitle || rightSlot) && (
            <div
              className="sticky top-0 z-40 mb-6"
              style={{
                backgroundColor: "hsl(var(--theme-surface-page) / 0.82)",
                borderBottom: "1px solid var(--theme-border-soft)",
                backdropFilter: "blur(8px)",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
                paddingBottom: "0.75rem",
              }}
            >
              <header className="flex items-start justify-between">
                {/* Title and subtitle */}
                {(title || subtitle) && (
                  <div className="space-y-2">
                    {title && (
                      <h1
                        className="font-serif"
                        style={{
                          fontSize: FRAME_CONSTANTS.titleSize,
                          letterSpacing: "0.01em",
                          color: "var(--theme-ink-primary)"
                        }}
                      >
                        {title}
                      </h1>
                    )}
                    {subtitle && (
                      <p
                        className="leading-relaxed"
                        style={{
                          fontSize: FRAME_CONSTANTS.subtitleSize,
                          color: "var(--theme-ink-secondary)"
                        }}
                      >
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}

                {/* Top-right controls */}
                {(rightSlot || themeSwitcherSlot || (isAuthenticated && v0Shell?.domainSlug)) && (
                  <div className="flex items-center gap-2">
                    {isAuthenticated && v0Shell?.domainSlug && (
                      <button
                        type="button"
                        aria-label="Open board admin"
                        onClick={handleOpenAdmin}
                        disabled={isOpeningAdmin}
                        className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/70 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm disabled:opacity-60"
                      >
                        <Settings className="w-4 h-4" strokeWidth={1.25} />
                      </button>
                    )}
                    {themeSwitcherSlot}
                    {rightSlot}
                  </div>
                )}
              </header>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1">
            {children}
          </div>

          {/* Optional footer area */}
          {footerSlot && (
            <footer className="mt-8">
              {footerSlot}
            </footer>
          )}
        </div>
        <Margin />
      </main>
    </StyleScope>
  )
}