"use client"

import * as React from "react"
import { Group, Panel, Separator, type Layout } from "react-resizable-panels"

export type KeeperBoardKind = "ide" | "agent"

export interface KeeperBoardPanelGroupProps {
  boardKind: KeeperBoardKind
  domainSlug: string
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
}

const PANEL_IDS = ["left", "center", "right"] as const

/** Default horizontal split (% left, center, right). */
const DEFAULT_PERCENT: Record<KeeperBoardKind, Record<(typeof PANEL_IDS)[number], number>> = {
  ide: { left: 15, center: 50, right: 35 },
  agent: { left: 15, center: 50, right: 35 },
}

const LAYOUT_VERSION = "v3"

/** Same format as react-resizable-panels `he(id, panelIds)`. */
function layoutStorageKey(groupId: string): string {
  return `react-resizable-panels:${groupId}:left:center:right`
}

function isValidStoredLayout(
  raw: Record<string, number> | undefined,
): raw is Record<(typeof PANEL_IDS)[number], number> {
  if (!raw || typeof raw !== "object") return false
  for (const id of PANEL_IDS) {
    const v = raw[id]
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false
  }
  const sum = PANEL_IDS.reduce((acc, id) => acc + raw[id], 0)
  if (Math.abs(sum - 100) >= 1) return false
  // Reject broken saves (e.g. center ~90%, rails ~0%) that match sum=100 but are unusable.
  if (raw.left < 10 || raw.right < 10) return false
  if (raw.center < 25) return false
  return true
}

function readInitialLayout(
  groupId: string,
  defaults: Record<(typeof PANEL_IDS)[number], number>,
): Record<(typeof PANEL_IDS)[number], number> {
  if (typeof localStorage === "undefined") return defaults
  try {
    const item = localStorage.getItem(layoutStorageKey(groupId))
    if (!item) return defaults
    const raw = JSON.parse(item) as Record<string, number>
    if (!isValidStoredLayout(raw)) return defaults
    return { left: raw.left, center: raw.center, right: raw.right }
  } catch {
    return defaults
  }
}

function persistLayout(groupId: string, layout: Layout): void {
  if (typeof localStorage === "undefined") return
  try {
    const L = layout as Record<string, number>
    const normalized = { left: L.left, center: L.center, right: L.right }
    if (!isValidStoredLayout(normalized)) return
    localStorage.setItem(layoutStorageKey(groupId), JSON.stringify(normalized))
  } catch {
    /* quota / private mode */
  }
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

  // IMPORTANT: Do not use `useDefaultLayout` here — it subscribes to localStorage and feeds a new
  // `defaultLayout` object after every save, which resets Group internal state and prevents pulling
  // side panels wider. Read once; persist only from onLayoutChanged.
  const [initialLayout] = React.useState(() => readInitialLayout(groupId, defaults))

  const onLayoutChanged = React.useCallback(
    (next: Layout) => {
      persistLayout(groupId, next)
    },
    [groupId],
  )

  const handleClass =
    "relative z-10 w-2 shrink-0 cursor-col-resize select-none rounded-full border-0 bg-[hsl(var(--theme-line-hairline)/0.45)] px-0 outline-none transition-colors hover:bg-[hsl(var(--theme-border-soft))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-1"

  return (
    <Group
      id={groupId}
      orientation="horizontal"
      className="h-full min-h-0 w-full"
      defaultLayout={initialLayout}
      onLayoutChanged={onLayoutChanged}
      resizeTargetMinimumSize={{ fine: 12, coarse: 28 }}
    >
      <Panel id="left" minSize={12} maxSize={50} className="min-h-0 min-w-0 overflow-hidden">
        {left}
      </Panel>
      <Separator className={handleClass} />
      <Panel id="center" minSize={28} className="min-h-0 min-w-0 overflow-hidden">
        {center}
      </Panel>
      <Separator className={handleClass} />
      <Panel id="right" minSize={12} maxSize={50} className="min-h-0 min-w-0 overflow-hidden">
        {right}
      </Panel>
    </Group>
  )
}
