"use client"

import * as React from "react"
import type { GlossAnchor, GlossContentSnapshot, GlossThread } from "@keeper/shared"
import {
  buildGlossAnchorDataAttribute,
  buildGlossSurfaceKey,
  buildGlossThreadKey,
} from "@keeper/shared"
import { useGloss } from "./GlossProvider"
import { GlossThreadPanel } from "./GlossThreadPanel"
import { describeGlossHint } from "./glossHints"
import { readSelectionWithin } from "./glossSelection"

export type GlossAffordancePlacement = "above" | "overlay" | "border"
export type GlossHighlightMode = "shadow" | "border"

export interface GlossSurfaceProps {
  anchor: GlossAnchor
  messageId: string
  snapshot?: GlossContentSnapshot
  glossThreads?: readonly GlossThread[]
  /** Nesting depth — deepest hovered surface wins the single affordance */
  depth?: number
  /** Override tooltip; defaults to describeGlossHint() */
  hoverHint?: string
  /** Text nodes default to above; images/cards default to overlay */
  affordancePlacement?: GlossAffordancePlacement
  /** shadow = box-shadow ring (receipts); border = recolor existing 1px border (chat bubbles) */
  highlightMode?: GlossHighlightMode
  /** When false, only children render unchanged */
  enabled?: boolean
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

function resolveAffordancePlacement(
  _anchor: GlossAnchor,
  explicit?: GlossAffordancePlacement,
): GlossAffordancePlacement {
  if (explicit) return explicit
  // Default overlay — keeps the hover affordance on the existing outline without in-flow layout shift.
  return "overlay"
}

function resolveGlossTarget(
  baseAnchor: GlossAnchor,
  baseSnapshot: GlossContentSnapshot | undefined,
  selectionText: string | null,
): { anchor: GlossAnchor; snapshot?: GlossContentSnapshot } {
  const selected = selectionText?.trim()
  if (!selected) {
    return { anchor: baseAnchor, snapshot: baseSnapshot }
  }

  const anchor: GlossAnchor = {
    ...baseAnchor,
    selectionText: selected,
  }

  const snapshot: GlossContentSnapshot = {
    ...baseSnapshot,
    label: "selection",
    text: selected,
  }

  return { anchor, snapshot }
}

export function GlossSurface({
  anchor,
  messageId,
  snapshot,
  glossThreads = [],
  depth = 0,
  hoverHint,
  affordancePlacement: affordancePlacementProp,
  highlightMode = "border",
  enabled = true,
  className,
  style,
  children,
}: GlossSurfaceProps) {
  const gloss = useGloss()
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const selectionRef = React.useRef<string | null>(null)
  const [liveSelection, setLiveSelection] = React.useState<string | null>(null)
  const [pressing, setPressing] = React.useState(false)
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const surfaceKey = buildGlossSurfaceKey(anchor)
  const isOpen = Boolean(gloss?.isOpenOnSurface(messageId, anchor))
  const openAnchor = isOpen && gloss?.activeOpen ? gloss.activeOpen.anchor : anchor
  const openSnapshot = isOpen && gloss?.activeOpen ? gloss.activeOpen.snapshot : snapshot
  const openThreadKey = buildGlossThreadKey(openAnchor)
  const isSending = gloss?.sendingKey === openThreadKey
  const isHoverWinner = gloss?.hoveredKey === surfaceKey
  const hint =
    hoverHint
    ?? describeGlossHint(openAnchor, openSnapshot, liveSelection)
  const affordancePlacement = resolveAffordancePlacement(anchor, affordancePlacementProp)

  const syncSelection = React.useCallback(() => {
    const text = readSelectionWithin(surfaceRef.current)
    selectionRef.current = text
    setLiveSelection(text)
    return text
  }, [])

  const clearPressTimer = React.useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  React.useEffect(() => () => clearPressTimer(), [clearPressTimer])

  // Keep phrase selection while hovering this surface (clicking Gloss can clear the DOM selection).
  React.useEffect(() => {
    if (!enabled || !isHoverWinner) return
    const onSelectionChange = () => {
      syncSelection()
    }
    document.addEventListener("selectionchange", onSelectionChange)
    return () => document.removeEventListener("selectionchange", onSelectionChange)
  }, [enabled, isHoverWinner, syncSelection])

  const handleOpen = React.useCallback(() => {
    if (!gloss || !enabled) return
    const selected = selectionRef.current ?? syncSelection()
    const resolved = resolveGlossTarget(anchor, snapshot, selected)
    gloss.openGloss(messageId, resolved.anchor, resolved.snapshot)
  }, [gloss, enabled, syncSelection, anchor, snapshot, messageId])

  const handleMouseEnter = React.useCallback(() => {
    if (!gloss || !enabled) return
    gloss.registerHover(surfaceKey, depth)
  }, [gloss, enabled, surfaceKey, depth])

  const handleMouseLeave = React.useCallback(() => {
    if (!gloss || !enabled) return
    gloss.unregisterHover(surfaceKey)
    // Keep selectionRef until open; clear live hint state when leaving.
    setLiveSelection(null)
  }, [gloss, enabled, surfaceKey])

  const handleMouseUp = React.useCallback(() => {
    if (!enabled) return
    syncSelection()
  }, [enabled, syncSelection])

  const handleTouchStart = React.useCallback(() => {
    if (!enabled) return
    setPressing(true)
    clearPressTimer()
    pressTimer.current = setTimeout(() => {
      handleOpen()
      setPressing(false)
    }, 480)
  }, [enabled, clearPressTimer, handleOpen])

  const handleTouchEnd = React.useCallback(() => {
    clearPressTimer()
    setPressing(false)
  }, [clearPressTimer])

  if (!enabled || !gloss) {
    return <>{children}</>
  }

  const affordanceAnchor = liveSelection
    ? { ...anchor, selectionText: liveSelection }
    : anchor
  const affordanceThreadKey = buildGlossThreadKey(isOpen ? openAnchor : affordanceAnchor)
  const openThread = glossThreads.find((t) => buildGlossThreadKey(t.anchor) === openThreadKey)
  const affordanceThread = glossThreads.find(
    (t) => buildGlossThreadKey(t.anchor) === affordanceThreadKey,
  )
  const messageCount = (isOpen ? openThread : affordanceThread)?.messages.length ?? 0
  const showAffordance = isHoverWinner || isOpen || pressing
  const showHighlight = isHoverWinner || isOpen

  const affordancePlacementClass =
    affordancePlacement === "above"
      ? "gloss-affordance--above"
      : affordancePlacement === "border"
        ? "gloss-affordance--border"
        : "gloss-affordance--overlay"

  const affordanceButton = showAffordance ? (
    <button
      type="button"
      className={["gloss-affordance", affordancePlacementClass].join(" ")}
      aria-label={hint}
      title={hint}
      onMouseDown={(e) => {
        // Capture selection before the button click clears it.
        e.preventDefault()
        syncSelection()
      }}
      onClick={(e) => {
        e.stopPropagation()
        handleOpen()
      }}
    >
      <span className="gloss-affordance__mark" aria-hidden>
        ✦
      </span>
      <span className="gloss-affordance__label">Gloss</span>
      {messageCount > 0 ? (
        <span className="gloss-affordance__count">{messageCount}</span>
      ) : null}
    </button>
  ) : null

  return (
    <div
      ref={surfaceRef}
      className={[
        "gloss-surface relative",
        highlightMode === "border" ? "gloss-surface--frame-border" : "",
        showHighlight ? "gloss-surface--highlight" : "",
        isOpen ? "gloss-surface--open" : "",
        pressing ? "gloss-surface--pressing" : "",
        liveSelection ? "gloss-surface--has-selection" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={style}
      data-gloss-anchor={buildGlossAnchorDataAttribute(openAnchor)}
      data-gloss-depth={depth}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {affordancePlacement === "above" && affordanceButton ? (
        <div className="gloss-affordance-row">{affordanceButton}</div>
      ) : null}

      {children}

      {(affordancePlacement === "overlay" || affordancePlacement === "border") && affordanceButton}

      {isOpen ? (
        <GlossThreadPanel
          anchor={openAnchor}
          messageId={messageId}
          snapshot={openSnapshot}
          thread={openThread}
          isSending={isSending}
          onClose={gloss.closeGloss}
          onSend={(text) =>
            void gloss.sendGloss({
              messageId,
              anchor: openAnchor,
              text,
              snapshot: openSnapshot,
              existingThreads: glossThreads,
            })
          }
        />
      ) : null}
    </div>
  )
}
