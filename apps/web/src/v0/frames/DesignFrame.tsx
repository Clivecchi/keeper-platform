"use client"

import type React from "react"
import { useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Settings } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { StyleScope } from "../styles/StyleScope"
import { Margin, V0_MARGIN_HEIGHT, V0_MARGIN_HEIGHT_WITH_COMPOSER } from "../components/Margin"
import { useAgentComposerContext } from "../shell/AgentComposerContext"
import { useAuth } from "../../context/AuthContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { apiFetch } from "../../lib/api"
import { getBlobProxyUrl } from "../../lib/blobProxy"

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
  /** Disable default admin control button */
  hideAdminControl?: boolean
  /** Sticky header top offset */
  headerStickyTop?: string
  /** Override header background color */
  headerBackgroundColor?: string
  /** Optional header footer content */
  headerFooterSlot?: React.ReactNode
  /** Header margin bottom override */
  headerMarginBottom?: string
  /** Frame padding top override */
  framePaddingTop?: string
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
  hideAdminControl = false,
  headerStickyTop,
  headerBackgroundColor,
  headerFooterSlot,
  headerMarginBottom,
  framePaddingTop,
  children,
  footerSlot,
  onClose
}: DesignFrameProps) {
  const { isAuthenticated } = useAuth()
  const v0Shell = useV0ShellOptional()
  const composerProps = useAgentComposerContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpeningAdmin, setIsOpeningAdmin] = useState(false)

  const isAgentFrame = v0Shell?.frame === "agent" || v0Shell?.frame === "kip"
  const marginHeight = isAgentFrame && composerProps ? V0_MARGIN_HEIGHT_WITH_COMPOSER : V0_MARGIN_HEIGHT

  // Cover background: match CoverFrame gradient (0.08, 0.75) so image shows through
  const coverImageUrl = v0Shell?.domainData?.theme?.coverImage ?? null
  const coverImageMode = v0Shell?.domainData?.theme?.coverImageMode ?? "cover"
  const displayCoverUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null
  const pageBackground = displayCoverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }
    : {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page)), hsl(var(--theme-surface-paper) / 0.25))`,
      }

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

    navigate(`/d/${v0Shell.domainSlug}?${params.toString()}`)
    setIsOpeningAdmin(false)
  }

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <main
        className="min-h-screen text-foreground"
        style={{
          color: "var(--theme-ink-primary)",
          ["--v0-margin-height" as any]: marginHeight,
          ...pageBackground,
        }}
      >
        <div
          className="mx-auto w-full max-w-5xl"
          style={{
            padding: FRAME_CONSTANTS.pad,
            paddingTop: framePaddingTop ?? FRAME_CONSTANTS.pad,
            paddingBottom: `calc(${FRAME_CONSTANTS.pad} + var(--v0-margin-height))`,
          }}
        >
          {/* Header area */}
          {(title || subtitle || rightSlot) && (
            <div
              className="sticky top-0 z-40"
              style={{
                backgroundColor: headerBackgroundColor ?? "hsl(var(--theme-surface-paper) / 0.96)",
                borderBottom: "1px solid var(--theme-border-soft)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 1px 0 0 hsl(var(--theme-border-soft) / 0.5)",
                paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
                paddingBottom: "0.75rem",
                top: headerStickyTop ?? "0",
                transition: "background-color 200ms ease",
                marginBottom: headerMarginBottom ?? "1.5rem",
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
                    {isAuthenticated && v0Shell?.domainSlug && !hideAdminControl && (
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
              {headerFooterSlot && <div className="mt-3">{headerFooterSlot}</div>}
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