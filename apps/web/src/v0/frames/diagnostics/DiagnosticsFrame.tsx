"use client"
import type { DiagnosticsFrameProps } from "../../components/diagnostics-frame"
import { DiagnosticsFrame as DiagnosticsFrameContent } from "../../components/diagnostics-frame"

export function DiagnosticsFrame(props: DiagnosticsFrameProps) {
  return <DiagnosticsFrameContent {...props} />
}
