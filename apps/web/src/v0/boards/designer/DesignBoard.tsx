"use client"

/**
 * DesignBoard — Moment 2.7 migration to UniversalBoard
 *
 * Architecturally distinct from IDE, Agent, and Domain boards.
 * Purpose: design the domain, not manage content.
 *
 * Shell removed: StyleScope, KeeperTopBar, DomainBriefSlideOver,
 * pageBackground, panel layout divs, density sub-bar.
 * UniversalBoard owns all of that now.
 *
 * What stays here:
 *   - Admin guard
 *   - All design-specific state: activeFrameKey, draftSpecJson, draftId,
 *     audience, density, dialogId, messages, activeBoardId, selectedBoardDefId
 *   - domainId resolution — handled by UniversalBoard's shell internally,
 *     but also resolved here for publish/dialog-restore flows that predate
 *     the universal shell and need domainId before UniversalBoard delivers it.
 *   - Dialog restore: GET /api/domains/:domainId/kip/dialogs/resolve/active
 *   - Publish handler: KipApi.createDraft / updateDraft / publishDraft
 *
 * Three panels via UniversalBoard render props:
 *   left   — UniversalSwitcherPanel (Frames + Board Definitions)
 *   center — DesignBoardCenter (KeeperDialogFrame, agentName="Design",
 *            centerPanelMode tabs, frame rail, handleSend preserved)
 *   right  — conditional: DesignBoardFrameDetail (frame selected) |
 *            BoardDefPanel (board def selected) | null → Chronicle
 *
 * API endpoint POST /api/domains/:domainId/kip/designer — unchanged.
 *
 * KE3P · Keeper Platform · Phase 1 · March 2026
 */

import * as React from "react"
import { useAuth } from "../../../context/AuthContext"
import { useV0Shell } from "../../shell/V0ShellContext"
import { loadDomainFrame } from "../../data/loadDomainFrame"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

import { UniversalBoard } from "../UniversalBoard"
import { DESIGNER_BOARD_DEF, BOARD_DEFINITIONS } from "../UniversalBoardDefinition"
import type { UniversalBoardDef } from "../UniversalBoardDefinition"
import { UniversalViewPanel, UniversalViewPanelIdle } from "../panels/UniversalViewPanel"
import { UniversalSwitcherPanel } from "../panels/UniversalSwitcherPanel"
import { DesignBoardCenter } from "./DesignBoardCenter"
import { DesignBoardFrameDetail } from "./DesignBoardFrameDetail"
import { BOARD_FRAMES } from "./DesignBoardFrameList"

// ─── Re-exported types (consumed by DesignBoardCenter, DesignBoardFrameList) ──

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
      {/* Header */}
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

      {/* JSON */}
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignerFrame() {
  const { isAdmin, isAuthenticated } = useAuth()
  const { domainSlug: ctxSlug, domainFrame: shellDomainFrame } = useV0Shell()
  const domainSlug = ctxSlug ?? ""

  // ── Local live domain frame ────────────────────────────────────────────────
  const [liveDomainFrame, setLiveDomainFrame] = React.useState<DomainFrameJson | null>(
    shellDomainFrame,
  )
  const [domainId, setDomainId] = React.useState<string | null>(null)

  // ── Design-specific state ──────────────────────────────────────────────────
  const [activeFrameKey, setActiveFrameKey] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<DesignerMessage[]>([])
  const [audience, setAudience] = React.useState<DesignerAudience>(
    () => (isAuthenticated ? "keeper" : "guest"),
  )

  // Dialog context — persistent session container for this conversation
  const [dialogId, setDialogId] = React.useState<string | null>(null)

  // Draft state — lifted so right panel can read it
  const [draftSpecJson, setDraftSpecJson] = React.useState<DomainFrameJson | null>(null)
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishSuccess, setPublishSuccess] = React.useState(false)

  // Left panel state
  const [activeBoardId, setActiveBoardId] = React.useState("domain")
  const [selectedBoardDefId, setSelectedBoardDefId] = React.useState<string | null>(null)

  // Density — stays at board root; applies data-density to <html> for CSS.
  // No in-app switcher is currently rendered; value is read from localStorage.
  const [density] = React.useState<KeeperDensity>(readStoredDensity)

  // ── Sync live frame from shell ─────────────────────────────────────────────
  React.useEffect(() => {
    if (shellDomainFrame) setLiveDomainFrame(shellDomainFrame)
  }, [shellDomainFrame])

  // ── Load domain ID ─────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    apiFetch(`/api/domains/by-slug/${domainSlug}`)
      .then((res: unknown) => {
        if (ignore) return
        const r = res as { id?: string }
        if (r?.id) setDomainId(r.id)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [domainSlug])

  // ── Sync audience when auth loads ──────────────────────────────────────────
  const prevAuthRef = React.useRef<boolean | null>(null)
  React.useEffect(() => {
    if (prevAuthRef.current === false && isAuthenticated) {
      setAudience("keeper")
    }
    prevAuthRef.current = isAuthenticated
  }, [isAuthenticated])

  // ── Density → document + localStorage ─────────────────────────────────────
  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", density)
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, density)
    } catch {
      /* ignore */
    }
  }, [density])

  // ── Dialog restore: reload history when activeFrameKey changes ────────────
  React.useEffect(() => {
    setDraftSpecJson(null)
    setDraftId(null)
    setPublishSuccess(false)
    setDialogId(null)
    setMessages([])

    if (!domainId || !activeFrameKey) return

    let cancelled = false

    apiFetch(
      `/api/domains/${domainId}/kip/dialogs/resolve/active?board=designer&frame=${encodeURIComponent(activeFrameKey)}&available_to=admin`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const dialog = (res as { dialog?: { id?: string; sessions?: unknown[] } })?.dialog
        if (!dialog) return

        setDialogId(dialog.id ?? null)

        const loaded: DesignerMessage[] = []
        const sessions = (dialog.sessions ?? []) as Array<{
          kip_messages?: Array<{ id: string; role: string; content: string }>
        }>
        for (const session of sessions) {
          for (const msg of session.kip_messages ?? []) {
            loaded.push({
              id: msg.id,
              role: msg.role === "assistant" ? "kip" : "user",
              content: msg.content,
            })
          }
        }
        if (loaded.length > 0) setMessages(loaded)
      })
      .catch(() => {
        // Non-critical — start fresh if resolution fails
      })

    return () => {
      cancelled = true
    }
  }, [activeFrameKey, domainId])

  // ── Reload live frame (called after publish) ───────────────────────────────
  const reloadLiveFrame = React.useCallback(async () => {
    if (!domainSlug) return
    try {
      const frame = await loadDomainFrame(domainSlug)
      setLiveDomainFrame(frame)
    } catch {
      /* keep current */
    }
  }, [domainSlug])

  // ── Direct-edit handler (from Canvas click-to-edit) ───────────────────────
  const handleDirectEdit = React.useCallback((updatedFrame: DomainFrameJson) => {
    setDraftSpecJson(updatedFrame)
    setDraftId(null)
    setPublishSuccess(false)
  }, [])

  // ── Publish handler ────────────────────────────────────────────────────────
  const handlePublish = React.useCallback(async () => {
    if (!draftSpecJson || !domainId || isPublishing) return
    setIsPublishing(true)
    try {
      let resolvedDraftId = draftId
      if (!resolvedDraftId) {
        const draft = await KipApi.createDraft(domainId, {
          kind: "domain_json",
          key: `direct-edit-${Date.now()}`,
          title: "Direct edit",
          spec: draftSpecJson as unknown as Record<string, unknown>,
        })
        resolvedDraftId = draft.id
        setDraftId(resolvedDraftId)
      }
      await KipApi.updateDraft(domainId, resolvedDraftId, {
        spec: draftSpecJson as unknown as Record<string, unknown>,
      })
      const pub = await KipApi.publishDraft(domainId, resolvedDraftId)
      console.log("[publish] response", pub)
      setPublishSuccess(true)
      setDraftSpecJson(null)
      setDraftId(null)
      await reloadLiveFrame()
      setTimeout(() => setPublishSuccess(false), 3000)
    } catch (err) {
      console.error("[DesignerFrame] publish failed:", err)
    } finally {
      setIsPublishing(false)
    }
  }, [draftId, draftSpecJson, domainId, isPublishing, reloadLiveFrame])

  // ── Frame select handler ───────────────────────────────────────────────────
  const handleFrameSelect = React.useCallback((key: string) => {
    setActiveFrameKey(key)
    setSelectedBoardDefId(null) // frame focus clears board-def selection in right panel
  }, [])

  // ── Board definition select handler ───────────────────────────────────────
  const handleBoardDefSelect = React.useCallback((id: string) => {
    setActiveBoardId(id)         // changes which frames are listed in Frames section
    setSelectedBoardDefId(id)    // drives right panel to show board def JSON
    setActiveFrameKey(null)      // clear frame focus when switching board def view
  }, [])

  // ── Derived: active frame info (for right panel DesignBoardFrameDetail) ───
  const activeFrameInfo = React.useMemo(() => {
    if (!activeFrameKey) return null
    const frames = BOARD_FRAMES[activeBoardId] ?? []
    return frames.find((f) => f.key === activeFrameKey) ?? null
  }, [activeFrameKey, activeBoardId])

  // ── Admin guard ────────────────────────────────────────────────────────────
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
          <p
            className="text-sm font-medium"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
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

      // ── Left — UniversalSwitcherPanel ──────────────────────────────────────
      left={(leftProps) => (
        <UniversalSwitcherPanel
          activeBoardId={activeBoardId}
          activeFrameKey={activeFrameKey}
          selectedBoardDefId={selectedBoardDefId}
          draftSpecJson={draftSpecJson}
          liveDomainFrame={liveDomainFrame}
          onSelectFrame={handleFrameSelect}
          onSelectBoard={handleBoardDefSelect}
        />
      )}

      // ── Center — Kip in Design Mode ────────────────────────────────────────
      center={(centerProps) => (
        <DesignBoardCenter
          domainId={centerProps.domainId}
          activeBoardId={activeBoardId}
          activeFrameKey={activeFrameKey}
          liveDomainFrame={liveDomainFrame}
          draftSpecJson={draftSpecJson}
          setDraftSpecJson={setDraftSpecJson}
          hasDraftSpec={draftSpecJson !== null}
          isPublishing={isPublishing}
          publishSuccess={publishSuccess}
          onPublish={handlePublish}
          messages={messages}
          setMessages={setMessages}
          draftId={draftId}
          setDraftId={setDraftId}
          dialogId={dialogId}
          setDialogId={setDialogId}
        />
      )}

      // ── Right — Chronicle (with conditional overrides) ─────────────────────
      // Frame selected   → DesignBoardFrameDetail (Preview, Config, Props, JSON tabs)
      // Board def selected → BoardDefPanel (JSON + structure)
      // Nothing selected → null → UniversalViewPanel (Chronicle) renders
      right={(rightProps) => {
        if (activeFrameKey && activeFrameInfo) {
          return (
            <DesignBoardFrameDetail
              domainSlug={rightProps.domainSlug}
              activeFrameKey={activeFrameKey}
              activeFrameInfo={activeFrameInfo}
              liveDomainFrame={liveDomainFrame}
              draftSpecJson={draftSpecJson}
              audience={audience}
              setAudience={setAudience}
              onDirectEdit={handleDirectEdit}
            />
          )
        }
        if (selectedBoardDefId) {
          const def = BOARD_DEFINITIONS[selectedBoardDefId]
          return def ? <BoardDefPanel def={def} /> : null
        }
        return null
      }}
    />
  )
}

/** Named export alias used by BOARD_REGISTRY */
export { DesignerFrame as DesignBoard }
