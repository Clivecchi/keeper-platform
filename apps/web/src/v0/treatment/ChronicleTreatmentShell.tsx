"use client"

import * as React from "react"
import { extractDomainThemeCover } from "@keeper/shared"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import {
  getSurfaceLook,
  getSurfaceLookVersion,
  subscribeSurfaceLook,
} from "../themes/surfaceLookStore"
import type { ResolvedDomainTreatment } from "./resolveDomainTreatment"
import { treatmentShellStyle } from "./treatmentCss"

export interface ChronicleTreatmentShellProps {
  treatment: ResolvedDomainTreatment
  children: React.ReactNode
}

/** Full Domain Treatment — Chronicle + Presents (background, accent, font). */
export function ChronicleTreatmentShell({
  treatment,
  children,
}: ChronicleTreatmentShellProps) {
  const shell = useV0ShellOptional()
  const surfaceVersion = React.useSyncExternalStore(
    subscribeSurfaceLook,
    getSurfaceLookVersion,
    getSurfaceLookVersion,
  )
  const surfaceLook = React.useMemo(() => getSurfaceLook(), [surfaceVersion])

  const domainCoverUrl = React.useMemo(() => {
    const cover = extractDomainThemeCover(shell?.domainData?.theme).coverImage?.trim()
    return cover ? getBlobProxyUrl(cover) : null
  }, [shell?.domainData?.theme])

  const atmosphereUrl = surfaceLook.atmosphereUrl ?? domainCoverUrl
  const resolvedTreatment =
    surfaceLook.palette
      ? {
          ...treatment,
          palette: {
            background: surfaceLook.palette.background,
            accent: surfaceLook.palette.accent,
          },
        }
      : treatment

  return (
    <div
      className="flex flex-col h-full min-h-0 keeper-chronicle-treatment"
      data-treatment-name={resolvedTreatment.name}
      data-treatment-tier="full"
      data-atmosphere={atmosphereUrl ? "image" : "color"}
      data-surface-look={surfaceLook.source}
      style={treatmentShellStyle(resolvedTreatment, { atmosphereUrl })}
    >
      {children}
    </div>
  )
}
