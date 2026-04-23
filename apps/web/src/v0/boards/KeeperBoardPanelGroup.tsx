"use client"

import * as React from "react"
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels"

export type KeeperBoardKind = "ide" | "agent"

export interface KeeperBoardPanelGroupProps {
  boardKind: KeeperBoardKind
  domainSlug: string
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
}

const PANEL_IDS = ["left", "center", "right"] as const

/** Default horizontal split (% left, center, right). IDE: 15 / 50 / 35 per product spec. */
const DEFAULT_PERCENT: Record<KeeperBoardKind, Record<(typeof PANEL_IDS)[number], number>> = {
  ide: { left: 15, center: 50, right: 35 },
  agent: { left: 15, center: 50, right: 35 },
}

const LAYOUT_VERSION = "v2"

function isValidStoredLayout(
  raw: Record<string, number> | undefined,
  defaults: Record<(typeof PANEL_IDS)[number], number>,
): raw is Record<(typeof PANEL_IDS)[number], number> {
  if (!raw || typeof raw !== "object") return false
  for (const id of PANEL_IDS) {
    const v = raw[id]
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false
  }
  const sum = PANEL_IDS.reduce((acc, id) => acc + raw[id], 0)
  return Math.abs(sum - 100) < 1
}

export function KeeperBoardPanelGroup({
  boardKind,
  domainSlug,
  left,
  center,
  right,
}: KeeperBoardPanelGroupProps) {
  const defaults = DEFAULT_PERCENT[boardKind]
  const groupId =
    domainSlug.trim().length > 0
      ? `keeper-board-panels-${LAYOUT_VERSION}:${boardKind}:${domainSlug}`
      : `keeper-board-panels-${LAYOUT_VERSION}:${boardKind}:default`

  const { defaultLayout: layoutFromStorage, onLayoutChanged } = useDefaultLayout({
    id: groupId,
    panelIds: [...PANEL_IDS],
    storage: localStorage,
  })

  const defaultLayout = React.useMemo((): Record<(typeof PANEL_IDS)[number], number> => {
    if (isValidStoredLayout(layoutFromStorage as Record<string, number> | undefined, defaults)) {
      return layoutFromStorage as Record<(typeof PANEL_IDS)[number], number>
    }
    // Use stable module reference — never `spread` a fresh object here or Group resets every render and resize breaks.
    return defaults
  }, [layoutFromStorage, defaults])

  const handleClass =
    "relative z-10 w-2 shrink-0 cursor-col-resize select-none rounded-full border-0 bg-[hsl(var(--theme-line-hairline)/0.45)] px-0 outline-none transition-colors hover:bg-[hsl(var(--theme-border-soft))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-1"

  return (
    <Group
      id={groupId}
      orientation="horizontal"
      className="h-full min-h-0 w-full"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ fine: 12, coarse: 28 }}
    >
      <Panel id="left" minSize={12} maxSize={45} className="min-h-0 min-w-0 overflow-hidden">
        {left}
      </Panel>
      <Separator className={handleClass} />
      <Panel id="center" minSize={28} className="min-h-0 min-w-0 overflow-hidden">
        {center}
      </Panel>
      <Separator className={handleClass} />
      <Panel id="right" minSize={12} maxSize={45} className="min-h-0 min-w-0 overflow-hidden">
        {right}
      </Panel>
    </Group>
  )
}
