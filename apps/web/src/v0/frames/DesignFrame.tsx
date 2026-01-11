"use client"

import type React from "react"
import type { StyleId } from "../styles/styles"
import { StyleScope } from "../styles/StyleScope"

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
  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <main
        className="min-h-screen text-foreground"
        style={{ backgroundColor: "var(--theme-surface-page)", color: "var(--theme-ink-primary)" }}
      >
        <div className="mx-auto w-full max-w-5xl" style={{ padding: FRAME_CONSTANTS.pad }}>
          {/* Header area */}
          {(title || subtitle || rightSlot) && (
            <header className="flex items-start justify-between mb-6">
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
              {(rightSlot || themeSwitcherSlot) && (
                <div className="flex items-center gap-2">
                  {themeSwitcherSlot}
                  {rightSlot}
                </div>
              )}
            </header>
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
      </main>
    </StyleScope>
  )
}