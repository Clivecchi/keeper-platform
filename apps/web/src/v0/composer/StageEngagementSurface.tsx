"use client"

/**
 * A Slide on Stage is a standalone engagement — media field + paper card.
 * Root uses the public Cover image. Beats use the same field until they have their own media.
 */

import * as React from "react"
import { extractDomainThemeCover } from "@keeper/shared"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { resolveDomainCoverUrl } from "../boards/domain/domainShellCache"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { stageThemeCssVars } from "../themes/stageThemeCss"
import { useKeeperStageOptional } from "./useKeeperStage"

export function useStageCoverMedia(): { url: string | null; mode: "cover" | "tile" } {
  const shell = useV0ShellOptional()
  const slug = shell?.domainSlug?.trim()
  const fromCache = slug ? resolveDomainCoverUrl(slug) : null
  const fromShell = extractDomainThemeCover(shell?.domainData?.theme).coverImage?.trim()
  const fromFrame = shell?.domainFrame?.theme.background?.trim()
  const raw = fromCache || (fromShell ? getBlobProxyUrl(fromShell) : null) || fromFrame || null
  const mode =
    shell?.domainData?.theme?.coverImageMode === "tile" ? "tile" : "cover"
  return { url: raw, mode }
}

export function StageEngagementSurface({
  mediaUrl,
  mediaMode = "cover",
  children,
}: {
  mediaUrl: string | null
  mediaMode?: "cover" | "tile"
  children: React.ReactNode
}) {
  const stageTheme = useKeeperStageOptional()?.stage.theme
  const field: React.CSSProperties = mediaUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.1), hsl(var(--theme-surface-page) / 0.35)), url(${mediaUrl})`,
        backgroundPosition: mediaMode === "tile" ? "0 0" : "center",
        backgroundSize: mediaMode === "tile" ? "auto" : "cover",
        backgroundRepeat: mediaMode === "tile" ? "repeat" : "no-repeat",
      }
    : { backgroundColor: "hsl(var(--theme-surface-page))" }

  return (
    <div
      className="relative flex h-full min-h-0 w-full items-center justify-center px-8 py-10"
      style={{ ...field, ...stageThemeCssVars(stageTheme) }}
      aria-label="Slide engagement"
    >
      <div
        className="theme-reading-plane w-full max-w-xl rounded-xl px-8 py-10"
        style={{
          boxShadow: "var(--theme-shadow-soft, 0 12px 40px hsl(30 20% 4% / 0.22))",
        }}
      >
        {children}
      </div>
    </div>
  )
}
