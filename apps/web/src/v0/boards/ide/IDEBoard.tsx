"use client"

import * as React from "react"
import { useV0Shell } from "../../shell/V0ShellContext"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { V0_MARGIN_HEIGHT } from "../../components/Margin"

export function IDEBoard() {
  useV0Shell() // ensures this Board is always rendered inside V0ShellProvider

  return (
    <div className="keeper-board-scope relative flex flex-col h-screen w-full overflow-hidden" style={{ background: "#f5f2eb" }}>
      <KeeperTopBar onDomainClick={() => {}} onBriefClick={() => {}} />

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ paddingBottom: V0_MARGIN_HEIGHT }}>
        {/* Left */}
        <div
          className="flex flex-col border-r border-[#e7e5e4] min-h-0"
          style={{ width: 220, minWidth: 220, background: "#fdfbf7" }}
        >
          <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: "#78716c" }}>
            IDE Nav
          </div>
        </div>

        {/* Center */}
        <div
          className="flex flex-col flex-1 min-w-0 min-h-0 border-r border-gray-200"
          style={{ background: "#fefdfb" }}
        >
          <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: "#78716c" }}>
            IDE Center
          </div>
        </div>

        {/* Right */}
        <div
          className="shrink-0 flex flex-col border-l border-gray-200 min-h-0"
          style={{ width: 380, background: "#faf8f5" }}
        >
          <div className="flex items-center justify-center flex-1 text-[13px]" style={{ color: "#78716c" }}>
            IDE Right
          </div>
        </div>
      </div>
    </div>
  )
}
