"use client"

import type { BoardMobilePanelId } from "../types/boardMobilePanel"
import { BOARD_MOBILE_PANEL_IDS, BOARD_MOBILE_PANEL_LABELS } from "../types/boardMobilePanel"

export interface BoardMobilePanelBarProps {
  activePanel: BoardMobilePanelId
  onPanelChange: (panel: BoardMobilePanelId) => void
  /** Override default Nav · Dialog · Chronicle labels (e.g. Dialog on realm home). */
  panelLabels?: Partial<Record<BoardMobilePanelId, string>>
}

export function BoardMobilePanelBar({
  activePanel,
  onPanelChange,
  panelLabels,
}: BoardMobilePanelBarProps) {
  return (
    <nav
      className="board-mobile-panel-bar shrink-0 border-t px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        backgroundColor: "hsl(var(--theme-surface-elevated, 0 0% 100%))",
      }}
      aria-label="Board panels"
    >
      <div className="grid grid-cols-3 gap-0.5">
        {BOARD_MOBILE_PANEL_IDS.map((panelId) => {
          const isActive = panelId === activePanel
          const label = panelLabels?.[panelId] ?? BOARD_MOBILE_PANEL_LABELS[panelId]
          return (
            <button
              key={panelId}
              type="button"
              onClick={() => onPanelChange(panelId)}
              className="rounded-xl px-1 py-2.5 text-[11px] font-medium transition-colors"
              style={{
                color: isActive
                  ? "hsl(var(--theme-ink-primary, 20 14% 14%))"
                  : "hsl(var(--theme-ink-secondary, 0 0% 45%))",
                backgroundColor: isActive
                  ? "hsl(var(--theme-surface-panel, 0 0% 96%))"
                  : "transparent",
              }}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
