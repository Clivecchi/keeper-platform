"use client"

import * as React from "react"
import type { ResolvedDomainTreatment } from "./resolveDomainTreatment"
import { treatmentAccentStyle } from "./treatmentCss"

export interface TreatmentAccentShellProps {
  treatment: ResolvedDomainTreatment
  children: React.ReactNode
  className?: string
}

/**
 * Accent-only Treatment for Nav and center Dialog.
 * Structure/layout stay on Theme; presence via accent border/wash, --treatment-color,
 * and --treatment-font-family for titles — not full background/body font.
 */
export function TreatmentAccentShell({
  treatment,
  children,
  className,
}: TreatmentAccentShellProps) {
  const classes = ["keeper-treatment-accent", "flex", "flex-col", "h-full", "min-h-0", className]
    .filter(Boolean)
    .join(" ")

  return (
    <div
      className={classes}
      data-treatment-name={treatment.name}
      data-treatment-tier="accent"
      style={treatmentAccentStyle(treatment)}
    >
      {children}
    </div>
  )
}
