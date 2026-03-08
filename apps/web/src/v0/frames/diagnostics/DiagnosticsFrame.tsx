"use client"
import type { DiagnosticsFrameProps } from "../../components/diagnostics-frame"
import { DiagnosticsFrame as DiagnosticsFrameContent } from "../../components/diagnostics-frame"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import { defaultDiagnosticsFrame } from "../../data/domain-frame.default"

export function DiagnosticsFrame(props: DiagnosticsFrameProps) {
  const { domainFrame } = useV0ShellOptional() ?? {}
  const diagnosticsLabels = domainFrame?.diagnostics ?? defaultDiagnosticsFrame
  return <DiagnosticsFrameContent {...props} diagnosticsLabels={diagnosticsLabels} />
}
