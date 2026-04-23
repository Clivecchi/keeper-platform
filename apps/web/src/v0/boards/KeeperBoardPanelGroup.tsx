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

/** Default horizontal split (% left, center, right) — tuned near legacy fixed widths at ~1400px viewport. */
const DEFAULT_PERCENT: Record<KeeperBoardKind, Record<(typeof PANEL_IDS)[number], number>> = {
  ide: { left: 19, center: 54, right: 27 },
  agent: { left: 16, center: 61, right: 23 },
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
      ? `keeper-board-panels:${boardKind}:${domainSlug}`
      : `keeper-board-panels:${boardKind}:default`

  const { defaultLayout: storedLayout, onLayoutChanged } = useDefaultLayout({
    id: groupId,
    panelIds: [...PANEL_IDS],
    storage: localStorage,
  })

  const defaultLayout = storedLayout ?? {
    left: defaults.left,
    center: defaults.center,
    right: defaults.right,
  }

  const handleClass =
    "w-1 shrink-0 cursor-col-resize rounded-full bg-[hsl(var(--theme-line-hairline)/0.4)] outline-none transition-colors hover:bg-[hsl(var(--theme-border-soft))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-1"

  return (
    <Group
      id={groupId}
      orientation="horizontal"
      className="h-full min-h-0 w-full"
      defaultLayout={defaultLayout}
      onLayoutChanged={onLayoutChanged}
    >
      <Panel id="left" defaultSize={defaults.left} minSize={15} maxSize={42} className="min-h-0 overflow-hidden">
        {left}
      </Panel>
      <Separator className={handleClass} />
      <Panel id="center" defaultSize={defaults.center} minSize={32} className="min-h-0 min-w-0 overflow-hidden">
        {center}
      </Panel>
      <Separator className={handleClass} />
      <Panel id="right" defaultSize={defaults.right} minSize={15} maxSize={42} className="min-h-0 overflow-hidden">
        {right}
      </Panel>
    </Group>
  )
}
