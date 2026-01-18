"use client"

import * as React from "react"
import { DiagnosticsFrame } from "../v0/frames/diagnostics/DiagnosticsFrame"

const DebugPage: React.FC = () => {
  return <DiagnosticsFrame returnPath="/" />
}

export default DebugPage

