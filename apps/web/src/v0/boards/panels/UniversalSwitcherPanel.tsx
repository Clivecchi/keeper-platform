"use client"

/**
 * UniversalSwitcherPanel
 * ======================
 * KE3P · Keeper Platform · Universal Board — Left Panel (Design Board)
 *
 * Static left panel for the Design Board. Two sections:
 *
 *   Frames          — list from BOARD_FRAMES[activeBoardId] with live/draft status dots
 *   Board Definitions — the four board defs from UniversalBoardDefinition.ts
 *
 * Selecting a Frame sets activeFrameKey. Selecting a Board Definition sets activeBoardId.
 * Both drive the center and right panels.
 *
 * No fetching. All data flows in as props.
 *
 * CRITICAL RULES:
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - Static list — no network calls.
 */

import * as React from "react"
import { BOARD_FRAMES, type FrameItem } from "../designer/DesignBoardFrameList"
import { BOARD_DEFINITIONS } from "../UniversalBoardDefinition"
import { FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { useUniversalBoardOptional } from "../UniversalBoardContext"
import { useDesignerDraftOptional } from "../DesignerDraftContext"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalSwitcherPanelProps {
  /** Which board's frames to display in the Frames section. */
  activeBoardId: string
  /** Selected board definition id — highlighted in Board Definitions list. */
  selectedBoardDefId: string | null
  /** Called when a Board Definition row is clicked. Sets activeBoardId. */
  onSelectBoard: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function frameHasDraft(
  frameKey: string,
  live: DomainFrameJson | null,
  draft: DomainFrameJson | null,
): boolean {
  if (!live || !draft) return false
  const jsonKey = FRAME_TO_JSON_KEY[frameKey]
  if (!jsonKey) return false
  try {
    const liveVal = (live as unknown as Record<string, unknown>)[jsonKey]
    const draftVal = (draft as unknown as Record<string, unknown>)[jsonKey]
    return JSON.stringify(liveVal) !== JSON.stringify(draftVal)
  } catch {
    return true
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="px-4 pt-4 pb-2 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
    >
      {children}
    </p>
  )
}

// ─── Frame row ────────────────────────────────────────────────────────────────

function FrameRow({
  frame,
  isActive,
  isDraft,
  onSelect,
}: {
  frame: FrameItem
  isActive: boolean
  isDraft: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors"
      style={{
        background: isActive ? "hsl(var(--theme-surface-elevated))" : "transparent",
        borderLeft: `2px solid ${
          isActive ? "hsl(var(--theme-ink-primary))" : "transparent"
        }`,
      }}
    >
      {/* Live / Draft status dot */}
      <span
        className="shrink-0 rounded-full"
        style={{
          width: 6,
          height: 6,
          background: isDraft
            ? "hsl(38 92% 50%)"
            : "hsl(152 69% 43%)",
        }}
        title={isDraft ? "Draft differs from live" : "Live"}
      />
      <span
        className="flex-1 text-[12px] leading-snug truncate"
        style={{
          color: isActive
            ? "hsl(var(--theme-ink-primary))"
            : "hsl(var(--theme-ink-secondary))",
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {frame.name}
      </span>
    </button>
  )
}

// ─── Board def row ────────────────────────────────────────────────────────────

function BoardDefRow({
  boardId,
  displayName,
  isActive,
  onSelect,
}: {
  boardId: string
  displayName: string
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-left transition-colors"
      style={{
        background: isActive ? "hsl(var(--theme-surface-elevated))" : "transparent",
        borderLeft: `2px solid ${
          isActive ? "hsl(var(--theme-accent-primary) / 0.7)" : "transparent"
        }`,
      }}
    >
      <span
        className="shrink-0 rounded-sm"
        style={{
          width: 6,
          height: 6,
          background: isActive
            ? "hsl(var(--theme-accent-primary) / 0.7)"
            : "hsl(var(--theme-ink-tertiary) / 0.4)",
        }}
      />
      <span
        className="flex-1 text-[12px] leading-snug truncate"
        style={{
          color: isActive
            ? "hsl(var(--theme-ink-primary))"
            : "hsl(var(--theme-ink-secondary))",
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {displayName}
      </span>
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UniversalSwitcherPanel({
  activeBoardId,
  selectedBoardDefId,
  onSelectBoard,
}: UniversalSwitcherPanelProps) {
  const boardCtx = useUniversalBoardOptional()
  const draftCtx = useDesignerDraftOptional()

  const activeFrameKey = boardCtx?.selection.selectedFrameKey ?? null
  const onSelectFrame = boardCtx?.actions.onFrameSelect ?? (() => {})
  const draftSpecJson = draftCtx?.draftSpecJson ?? null
  const liveDomainFrame = draftCtx?.liveDomainFrame ?? null

  const frames: FrameItem[] = BOARD_FRAMES[activeBoardId] ?? []
  const boardDefs = Object.values(BOARD_DEFINITIONS)

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "hsl(var(--theme-surface-panel) / 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "8px",
        border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
      }}
    >
      <div className="flex-1 overflow-y-auto min-h-0 keeper-panel-scroll">

        {/* ── Frames section ─────────────────────────────────────────────── */}
        <SectionLabel>Frames</SectionLabel>

        {frames.length === 0 ? (
          <p
            className="px-4 py-2 text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No frames defined
          </p>
        ) : (
          <ul>
            {frames.map((frame) => (
              <li key={frame.key}>
                <FrameRow
                  frame={frame}
                  isActive={frame.key === activeFrameKey}
                  isDraft={frameHasDraft(frame.key, liveDomainFrame, draftSpecJson)}
                  onSelect={() => onSelectFrame(frame.key)}
                />
              </li>
            ))}
          </ul>
        )}

        {/* ── Board Definitions section ───────────────────────────────────── */}
        <div
          className="mt-2"
          style={{ borderTop: "1px solid hsl(var(--theme-border-soft) / 0.2)" }}
        >
          <SectionLabel>Board Definitions</SectionLabel>
        </div>

        <ul>
          {boardDefs.map((def) => (
            <li key={def.boardId}>
              <BoardDefRow
                boardId={def.boardId}
                displayName={def.displayName}
                isActive={def.boardId === selectedBoardDefId}
                onSelect={() => onSelectBoard(def.boardId)}
              />
            </li>
          ))}
        </ul>

      </div>
    </div>
  )
}
