"use client"

/**
 * DesignBoard — Universal Board implementation for the Design Board
 *
 * After Gap 1 migration:
 *   - Center panel: UniversalConversation (no override). Handles all Kip
 *     conversation, draft creation, publish, and dialog restore for designer mode.
 *   - Left panel: DesignBoardLeftPanel — renders UniversalSwitcherPanel.
 *     Frame key and draft state flow through UniversalBoardContext and
 *     DesignerDraftContext; no local state for those concerns here.
 *   - Right panel: DesignBoardRightPanel — renders DesignBoardFrameDetail or
 *     BoardDefPanel. Loads board-data internally; owns frameEntryMap state.
 *
 * What stays here: admin guard, board navigation state (activeBoardId,
 * selectedBoardDefId), audience state, handleAddProp.
 *
 * KE3P · Keeper Platform · Phase 1 · March 2026
 */

import * as React from "react"
import { useAuth } from "../../../context/AuthContext"
import { apiFetch } from "../../../lib/api"

import { UniversalBoard } from "../UniversalBoard"
import { DESIGNER_BOARD_DEF, BOARD_DEFINITIONS } from "../UniversalBoardDefinition"
import type { UniversalBoardDef } from "../UniversalBoardDefinition"
import { useUniversalBoard } from "../UniversalBoardContext"
import { UniversalSwitcherPanel } from "../panels/UniversalSwitcherPanel"
import { DesignBoardFrameDetail } from "./DesignBoardFrameDetail"
import type { FrameProp } from "./DesignBoardFrameDetail"
import { BOARD_FRAMES } from "./DesignBoardFrameList"
import type { FrameItem } from "./DesignBoardFrameList"

// ─── Re-exported types (consumed by DesignBoardFrameDetail, DesignBoardFrameList) ──

export type KeeperDensity = "compact" | "default" | "comfortable"

const DENSITY_STORAGE_KEY = "keeper-density"

function readStoredDensity(): KeeperDensity {
  if (typeof window === "undefined") return "default"
  try {
    const v = localStorage.getItem(DENSITY_STORAGE_KEY)
    if (v === "compact" || v === "comfortable") return v
  } catch {
    /* ignore */
  }
  return "default"
}

export type DesignerMessage = {
  id: string
  role: "user" | "kip"
  content: string
  /** Present when Kip proposed a JSON block */
  draftProposal?: unknown
}

export type DesignerAudience = "guest" | "keeper" | "admin"

type FrameEntry = {
  boardId: string
  frameInstanceId: string
  props: FrameProp[]
}

// ─── Board Definition right panel ─────────────────────────────────────────────

function BoardDefPanel({ def }: { def: UniversalBoardDef }) {
  const json = JSON.stringify(def, null, 2)

  const highlighted = json.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let color = "hsl(var(--theme-accent-secondary))"
      if (/^"/.test(match)) {
        color = /:$/.test(match)
          ? "hsl(var(--theme-ink-primary))"
          : "hsl(var(--theme-accent-primary) / 0.8)"
      } else if (/true|false/.test(match)) {
        color = "hsl(var(--theme-accent-tertiary, var(--theme-accent-primary)))"
      } else if (/null/.test(match)) {
        color = "hsl(var(--theme-ink-tertiary))"
      }
      return `<span style="color:${color}">${match}</span>`
    },
  )

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
      <div
        className="shrink-0 px-4 py-3 border-b"
        style={{ borderColor: "hsl(var(--theme-border-soft) / 0.25)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Board Definition
        </p>
        <h2
          className="mt-1 text-[14px] font-semibold"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {def.displayName}
        </h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-medium border"
            style={{
              background: "hsl(var(--theme-surface-elevated) / 0.5)",
              color: "hsl(var(--theme-ink-secondary))",
              borderColor: "hsl(var(--theme-border-soft) / 0.4)",
            }}
          >
            {def.boardId}
          </span>
          {def.access.isAdminOnly && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium border"
              style={{
                background: "hsl(var(--theme-status-warning, 38 92% 50%) / 0.12)",
                color: "hsl(var(--theme-status-warning, 38 92% 32%))",
                borderColor: "hsl(var(--theme-status-warning, 38 92% 50%) / 0.3)",
              }}
            >
              admin only
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto min-h-0 keeper-panel-scroll">
        <pre
          className="p-4 text-[11px] leading-relaxed"
          style={{
            fontFamily: "ui-monospace, 'Cascadia Code', monospace",
            color: "hsl(var(--theme-ink-secondary))",
          }}
          dangerouslySetInnerHTML={{ __html: highlighted }}
        />
      </div>
    </div>
  )
}

// ─── Left panel sub-component ─────────────────────────────────────────────────
// Proper component so it can call context hooks (inside UniversalBoardProvider).

interface DesignBoardLeftPanelProps {
  activeBoardId: string
  selectedBoardDefId: string | null
  onSelectBoard: (id: string) => void
}

function DesignBoardLeftPanel({
  activeBoardId,
  selectedBoardDefId,
  onSelectBoard,
}: DesignBoardLeftPanelProps) {
  return (
    <UniversalSwitcherPanel
      activeBoardId={activeBoardId}
      selectedBoardDefId={selectedBoardDefId}
      onSelectBoard={onSelectBoard}
    />
  )
}

// ─── Right panel sub-component ────────────────────────────────────────────────
// Loads board-data, manages frameEntryMap, renders DesignBoardFrameDetail or BoardDefPanel.
// Proper component so it can call context hooks (inside UniversalBoardProvider).

interface DesignBoardRightPanelProps {
  domainId: string | null
  domainSlug: string
  activeBoardId: string
  selectedBoardDefId: string | null
  audience: DesignerAudience
  setAudience: (a: DesignerAudience) => void
}

function DesignBoardRightPanel({
  domainId,
  domainSlug,
  activeBoardId,
  selectedBoardDefId,
  audience,
  setAudience,
}: DesignBoardRightPanelProps) {
  const { selection } = useUniversalBoard()
  const activeFrameKey = selection.selectedFrameKey

  const [frameEntryMap, setFrameEntryMap] = React.useState<Map<string, FrameEntry>>(new Map())

  // Load board-data for frame instance IDs + existing props
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    apiFetch(`/api/domains/${domainId}/board-data`)
      .then((res: unknown) => {
        if (cancelled) return
        const r = res as {
          board?: {
            id: string
            frames: Array<{ id: string; name: string; props: unknown }>
          }
        }
        if (!r?.board) return
        const map = new Map<string, FrameEntry>()
        for (const frame of r.board.frames) {
          const rawProps = Array.isArray(frame.props) ? (frame.props as FrameProp[]) : []
          map.set(frame.name.toLowerCase(), {
            boardId: r.board.id,
            frameInstanceId: frame.id,
            props: rawProps,
          })
        }
        setFrameEntryMap(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [domainId])

  const activeFrameInfo = React.useMemo((): FrameItem | null => {
    if (!activeFrameKey) return null
    const frames = BOARD_FRAMES[activeBoardId] ?? []
    return frames.find((f) => f.key === activeFrameKey) ?? null
  }, [activeFrameKey, activeBoardId])

  const activeFrameEntry = React.useMemo((): FrameEntry | null => {
    if (!activeFrameInfo) return null
    return frameEntryMap.get(activeFrameInfo.name.toLowerCase()) ?? null
  }, [activeFrameInfo, frameEntryMap])

  const handleAddProp = React.useCallback(
    async (type: string, config: Record<string, unknown>) => {
      if (!activeFrameEntry) return
      const { boardId, frameInstanceId, props: currentProps } = activeFrameEntry
      const newProp: FrameProp = { id: `prop_${Date.now()}`, type, config }
      const updatedProps = [...currentProps, newProp]

      setFrameEntryMap((prev) => {
        const next = new Map(prev)
        for (const [key, entry] of next) {
          if (entry.frameInstanceId === frameInstanceId) {
            next.set(key, { ...entry, props: updatedProps })
            break
          }
        }
        return next
      })

      try {
        await apiFetch(`/api/boards/${boardId}/frames/${frameInstanceId}`, {
          method: "PATCH",
          body: JSON.stringify({ props: updatedProps }),
        })
      } catch (err) {
        console.error("[DesignBoard] props PATCH failed:", err)
      }
    },
    [activeFrameEntry],
  )

  if (activeFrameKey && activeFrameInfo) {
    return (
      <DesignBoardFrameDetail
        domainSlug={domainSlug}
        activeFrameKey={activeFrameKey}
        activeFrameInfo={activeFrameInfo}
        audience={audience}
        setAudience={setAudience}
        frameInstanceProps={activeFrameEntry?.props ?? []}
        onAddProp={activeFrameEntry ? handleAddProp : null}
      />
    )
  }

  if (selectedBoardDefId) {
    const def = BOARD_DEFINITIONS[selectedBoardDefId]
    return def ? <BoardDefPanel def={def} /> : null
  }

  return null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignerFrame() {
  const { isAdmin, isAuthenticated } = useAuth()

  const [audience, setAudience] = React.useState<DesignerAudience>(
    () => (isAuthenticated ? "keeper" : "guest"),
  )
  const [activeBoardId, setActiveBoardId] = React.useState("domain")
  const [selectedBoardDefId, setSelectedBoardDefId] = React.useState<string | null>(null)

  // Sync audience when auth loads
  const prevAuthRef = React.useRef<boolean | null>(null)
  React.useEffect(() => {
    if (prevAuthRef.current === false && isAuthenticated) setAudience("keeper")
    prevAuthRef.current = isAuthenticated
  }, [isAuthenticated])

  // Density — no in-app switcher currently; value read from localStorage on mount.
  const [density] = React.useState<KeeperDensity>(readStoredDensity)
  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", density)
    try { localStorage.setItem(DENSITY_STORAGE_KEY, density) } catch { /* ignore */ }
  }, [density])

  const handleBoardDefSelect = React.useCallback((id: string) => {
    setActiveBoardId(id)
    setSelectedBoardDefId(id)
    // Frame focus is cleared via UniversalBoardContext.onFrameSelect — the
    // context does not clear selectedFrameKey on board-def change, but the
    // right panel switch to BoardDefPanel is driven by selectedBoardDefId here.
  }, [])

  // Admin guard
  if (!isAdmin) {
    return (
      <div
        className="flex h-screen items-center justify-center"
        style={{ background: "hsl(var(--theme-surface-page))" }}
      >
        <div
          className="rounded-xl px-8 py-6 text-center"
          style={{
            background: "hsl(var(--theme-surface-panel))",
            border: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Access restricted
          </p>
          <p className="mt-1 text-xs" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Designer Frame is available to Platform Admins only.
          </p>
        </div>
      </div>
    )
  }

  return (
    <UniversalBoard
      def={DESIGNER_BOARD_DEF}

      left={() => (
        <DesignBoardLeftPanel
          activeBoardId={activeBoardId}
          selectedBoardDefId={selectedBoardDefId}
          onSelectBoard={handleBoardDefSelect}
        />
      )}

      right={(rightProps) => (
        <DesignBoardRightPanel
          domainId={rightProps.domainId}
          domainSlug={rightProps.domainSlug}
          activeBoardId={activeBoardId}
          selectedBoardDefId={selectedBoardDefId}
          audience={audience}
          setAudience={setAudience}
        />
      )}
    />
  )
}

/** Named export alias used by BOARD_REGISTRY */
export { DesignerFrame as DesignBoard }
