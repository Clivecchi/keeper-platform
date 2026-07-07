"use client"

import * as React from "react"
import type { ResolvedDomainTreatment } from "./resolveDomainTreatment"
import { treatmentShellStyle } from "./treatmentCss"

export interface ChronicleTreatmentShellProps {
  treatment: ResolvedDomainTreatment
  children: React.ReactNode
}

/** Applies domain Treatment to Chronicle only — not the full board shell. */
export function ChronicleTreatmentShell({
  treatment,
  children,
}: ChronicleTreatmentShellProps) {
  return (
    <div
      className="flex flex-col h-full min-h-0 keeper-chronicle-treatment"
      data-treatment-name={treatment.name}
      style={treatmentShellStyle(treatment)}
    >
      {children}
    </div>
  )
}
