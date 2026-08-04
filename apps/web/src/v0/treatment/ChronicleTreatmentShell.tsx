"use client"

import * as React from "react"
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
  return (
    <div
      className="flex flex-col h-full min-h-0 keeper-chronicle-treatment"
      data-treatment-name={treatment.name}
      data-treatment-tier="full"
      style={treatmentShellStyle(treatment)}
    >
      {children}
    </div>
  )
}
