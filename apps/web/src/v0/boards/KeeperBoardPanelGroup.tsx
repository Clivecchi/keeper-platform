"use client"

import * as React from "react"
import type { WorkspaceSurface } from "@keeper/shared"

export type KeeperBoardKind = "build" | "agent"

export type PanelSplit = { leftPct: number; rightPct: number }

export interface KeeperBoardPanelGroupProps {
  boardKind: KeeperBoardKind
  domainSlug: string
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
  /** Dialog keeps stored split. Stage uses locked symmetric curtains. */
  workspaceSurface?: WorkspaceSurface
}

/** Side rails: % of row. Center fills `100 - left - right`. */
const MIN_SIDE = 12
const MIN_CENTER = 28
const MAX_SIDE = 52
const LAYOUT_VERSION = "v4"

const DEFAULTS: Record<KeeperBoardKind, PanelSplit> = {
  build: { leftPct: 15, rightPct: 35 },
  agent: { leftPct: 15, rightPct: 35 },
}

/** Stage room — matched curtains. Center is 70%. */
export const STAGE_CURTAIN_SPLIT: PanelSplit = { leftPct: 15, rightPct: 15 }

export function panelSplitForSurface(
  surface: WorkspaceSurface | undefined,
  stored: PanelSplit,
): PanelSplit {
  return surface === "stage" ? STAGE_CURTAIN_SPLIT : stored
}

function storageKey(groupId: string) {
  return `keeper-board-split-${LAYOUT_VERSION}:${groupId}`
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function validPair(leftPct: number, rightPct: number): boolean {
  return (
    leftPct >= MIN_SIDE - 0.5 &&
    rightPct >= MIN_SIDE - 0.5 &&
    leftPct + rightPct <= 100 - MIN_CENTER + 0.5 &&
    leftPct <= MAX_SIDE + 0.5 &&
    rightPct <= MAX_SIDE + 0.5
  )
}

function loadStored(
  groupId: string,
  fallback: { leftPct: number; rightPct: number },
  legacyGroupId?: string | null,
) {
  if (typeof localStorage === "undefined") return fallback
  const current = readStoredPair(groupId)
  if (current) return current
  if (legacyGroupId) {
    const legacy = readStoredPair(legacyGroupId)
    if (legacy) {
      saveStored(groupId, legacy.leftPct, legacy.rightPct)
      return legacy
    }
  }
  return fallback
}

function readStoredPair(groupId: string): { leftPct: number; rightPct: number } | null {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(groupId)) || "null") as {
      leftPct?: number
      rightPct?: number
    }
    if (
      typeof raw?.leftPct === "number" &&
      typeof raw?.rightPct === "number" &&
      validPair(raw.leftPct, raw.rightPct)
    ) {
      return { leftPct: raw.leftPct, rightPct: raw.rightPct }
    }
  } catch {
    /* ignore */
  }
  return null
}

function saveStored(groupId: string, leftPct: number, rightPct: number) {
  if (typeof localStorage === "undefined") return
  try {
    if (!validPair(leftPct, rightPct)) return
    localStorage.setItem(storageKey(groupId), JSON.stringify({ leftPct, rightPct }))
  } catch {
    /* ignore */
  }
}

const HANDLE_CLASS =
  "relative z-20 w-[4px] shrink-0 cursor-col-resize select-none bg-transparent outline-none group focus-visible:ring-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-1"

const HANDLE_LOCKED_CLASS =
  "relative z-20 w-[4px] shrink-0 select-none bg-transparent outline-none"

export function KeeperBoardPanelGroup({
  boardKind,
  domainSlug,
  left: leftChild,
  center: centerChild,
  right: rightChild,
  workspaceSurface = "dialog",
}: KeeperBoardPanelGroupProps) {
  const fallback = DEFAULTS[boardKind]
  const slugKey = domainSlug.trim().length > 0 ? domainSlug : "default"
  const groupId = `keeper-board-${boardKind}:${slugKey}`
  const legacyGroupId =
    boardKind === "build" ? `keeper-board-ide:${slugKey}` : null

  const [storedSplit, setPercents] = React.useState(() =>
    loadStored(groupId, fallback, legacyGroupId),
  )
  const { leftPct, rightPct } = panelSplitForSurface(workspaceSurface, storedSplit)
  const curtainsLocked = workspaceSurface === "stage"

  const rootRef = React.useRef<HTMLDivElement>(null)

  const onResizePointerDown = React.useCallback(
    (edge: "left" | "right", e: React.PointerEvent) => {
      if (curtainsLocked || e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      const root = rootRef.current
      if (!root) return

      const widthPx = root.getBoundingClientRect().width || 1
      const startX = e.clientX
      const startLeft = storedSplit.leftPct
      const startRight = storedSplit.rightPct

      const last = { left: startLeft, right: startRight }

      const onMove = (ev: PointerEvent) => {
        const dPct = ((ev.clientX - startX) / widthPx) * 100
        if (edge === "left") {
          let nextLeft = clamp(startLeft + dPct, MIN_SIDE, MAX_SIDE)
          if (nextLeft + startRight > 100 - MIN_CENTER) {
            nextLeft = 100 - MIN_CENTER - startRight
          }
          last.left = nextLeft
          last.right = startRight
          setPercents({ leftPct: nextLeft, rightPct: startRight })
        } else {
          let nextRight = clamp(startRight - dPct, MIN_SIDE, MAX_SIDE)
          if (startLeft + nextRight > 100 - MIN_CENTER) {
            nextRight = 100 - MIN_CENTER - startLeft
          }
          last.left = startLeft
          last.right = nextRight
          setPercents({ leftPct: startLeft, rightPct: nextRight })
        }
      }

      const end = () => {
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", end)
        window.removeEventListener("pointercancel", end)
        saveStored(groupId, last.left, last.right)
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", end)
      window.addEventListener("pointercancel", end)
    },
    [curtainsLocked, groupId, storedSplit.leftPct, storedSplit.rightPct],
  )

  return (
    <div ref={rootRef} className="flex h-full min-h-0 w-full min-w-0 flex-row gap-[10px]">
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{ flex: `0 0 ${leftPct}%` }}
      >
        {leftChild}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={curtainsLocked ? "Stage left curtain" : "Resize left panel"}
        aria-disabled={curtainsLocked}
        className={curtainsLocked ? HANDLE_LOCKED_CLASS : HANDLE_CLASS}
        style={{ touchAction: curtainsLocked ? "auto" : "none" }}
        onPointerDown={(e) => onResizePointerDown("left", e)}
      >
        {curtainsLocked ? null : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-8 rounded-full bg-transparent group-hover:bg-[hsl(var(--theme-border)/0.6)] transition-colors duration-150" />
        )}
      </div>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ flex: "1 1 0%", minWidth: 0 }}>
        {centerChild}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={curtainsLocked ? "Stage right curtain" : "Resize right panel"}
        aria-disabled={curtainsLocked}
        className={curtainsLocked ? HANDLE_LOCKED_CLASS : HANDLE_CLASS}
        style={{ touchAction: curtainsLocked ? "auto" : "none" }}
        onPointerDown={(e) => onResizePointerDown("right", e)}
      >
        {curtainsLocked ? null : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] h-8 rounded-full bg-transparent group-hover:bg-[hsl(var(--theme-border)/0.6)] transition-colors duration-150" />
        )}
      </div>
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{ flex: `0 0 ${rightPct}%` }}
      >
        {rightChild}
      </div>
    </div>
  )
}
