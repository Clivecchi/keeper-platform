"use client"

import * as React from "react"

export type KeeperBoardKind = "ide" | "agent"

export interface KeeperBoardPanelGroupProps {
  boardKind: KeeperBoardKind
  domainSlug: string
  left: React.ReactNode
  center: React.ReactNode
  right: React.ReactNode
}

/** Side rails: % of row. Center fills `100 - left - right`. */
const MIN_SIDE = 12
const MIN_CENTER = 28
const MAX_SIDE = 52
const LAYOUT_VERSION = "v4"

const DEFAULTS: Record<KeeperBoardKind, { leftPct: number; rightPct: number }> = {
  ide: { leftPct: 15, rightPct: 35 },
  agent: { leftPct: 15, rightPct: 35 },
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

function loadStored(groupId: string, fallback: { leftPct: number; rightPct: number }) {
  if (typeof localStorage === "undefined") return fallback
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
  return fallback
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
  "relative z-20 w-2 shrink-0 cursor-col-resize select-none rounded-full border-0 bg-[hsl(var(--theme-line-hairline)/0.45)] outline-none transition-colors hover:bg-[hsl(var(--theme-border-soft))] focus-visible:ring-2 focus-visible:ring-[hsl(var(--theme-focus-ring))] focus-visible:ring-offset-1"

export function KeeperBoardPanelGroup({
  boardKind,
  domainSlug,
  left: leftChild,
  center: centerChild,
  right: rightChild,
}: KeeperBoardPanelGroupProps) {
  const fallback = DEFAULTS[boardKind]
  const groupId =
    domainSlug.trim().length > 0
      ? `keeper-board-${boardKind}:${domainSlug}`
      : `keeper-board-${boardKind}:default`

  const [{ leftPct, rightPct }, setPercents] = React.useState(() => loadStored(groupId, fallback))

  const rootRef = React.useRef<HTMLDivElement>(null)

  const onResizePointerDown = React.useCallback(
    (edge: "left" | "right", e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()

      const root = rootRef.current
      if (!root) return

      const widthPx = root.getBoundingClientRect().width || 1
      const startX = e.clientX
      const startLeft = leftPct
      const startRight = rightPct

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
    [groupId, leftPct, rightPct],
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
        aria-label="Resize left panel"
        className={HANDLE_CLASS}
        style={{ touchAction: "none" }}
        onPointerDown={(e) => onResizePointerDown("left", e)}
      />
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden" style={{ flex: "1 1 0%", minWidth: 0 }}>
        {centerChild}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize right panel"
        className={HANDLE_CLASS}
        style={{ touchAction: "none" }}
        onPointerDown={(e) => onResizePointerDown("right", e)}
      />
      <div
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{ flex: `0 0 ${rightPct}%` }}
      >
        {rightChild}
      </div>
    </div>
  )
}
