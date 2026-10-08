"use client"

/**
 * Composer place control. Switches Domain / Place through the existing travel list.
 * Agents are not in this chooser.
 */

import { useDomainSwitcher } from "../domain/DomainSwitcherOverlay"
import { useV0ShellOptional } from "../../shell/V0ShellContext"
import type { WorkspaceBoardId } from "../workspaceBoardNav"
import { resolveEnteredPlaceName } from "./stagePlace"

export function StagePlaceControl({ domainName }: { domainName?: string | null }) {
  const shell = useV0ShellOptional()
  const boardId = (shell?.workspaceBoardId ?? "realm") as WorkspaceBoardId
  const { openSwitcher, switcherOverlay, isSwitcherOpen } = useDomainSwitcher(boardId)
  const place = resolveEnteredPlaceName({
    shellMode: shell?.shellMode,
    homeDisplayName: shell?.homeDisplayName,
    domainName,
  })

  return (
    <div className="relative mb-2">
      <button
        type="button"
        onClick={openSwitcher}
        aria-expanded={isSwitcherOpen}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px]"
        style={{
          color: "hsl(var(--theme-ink-primary))",
          background: "hsl(var(--theme-surface-panel) / 0.55)",
          border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
        }}
      >
        <span className="max-w-[14rem] truncate">{place}</span>
        <span aria-hidden style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          ▾
        </span>
      </button>
      {isSwitcherOpen ? (
        <div
          className="absolute bottom-full left-0 z-40 mb-2 w-[min(340px,72vw)] overflow-hidden rounded-lg"
          style={{
            border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
            background: "hsl(var(--theme-surface-panel) / 0.96)",
            boxShadow: "0 8px 24px hsl(var(--theme-ink-primary) / 0.18)",
          }}
        >
          {switcherOverlay}
        </div>
      ) : null}
    </div>
  )
}
