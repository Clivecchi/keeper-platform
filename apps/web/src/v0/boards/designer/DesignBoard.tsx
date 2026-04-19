"use client"

/**
 * DesignBoard (was DesignerFrame)
 *
 * Platform Admin–only surface. Three panels at full viewport height:
 *   Left   — DesignBoardList       (collapsible board & template list)
 *   Center — DesignBoardFrameList  (frame rows + view toggles + Kip chat)
 *   Right  — DesignBoardFrameDetail (tabbed: Preview, Config, Props, JSON)
 *
 * Interaction loop: Kip proposes → Preview updates → Human approves → Frame publishes.
 *
 * KE3P · Keeper Platform · Phase 1 · March 2026
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { StyleId } from "../../styles/styles"
import { useAuth } from "../../../context/AuthContext"
import { useV0Shell } from "../../shell/V0ShellContext"
import { loadDomainFrame } from "../../data/loadDomainFrame"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

import { StyleScope } from "../../styles/StyleScope"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { DesignBoardList } from "./DesignBoardList"
import { DesignBoardFrameList, BOARD_FRAMES } from "./DesignBoardFrameList"
import { DesignBoardFrameDetail } from "./DesignBoardFrameDetail"

// ─── Density ───────────────────────────────────────────────────────────────────

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

// ─── Density segments ─────────────────────────────────────────────────────────

const DENSITY_SEGMENTS: { key: KeeperDensity; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "default", label: "Default" },
  { key: "comfortable", label: "Comfortable" },
]

export type DesignerMessage = {
  id: string
  role: "user" | "kip"
  content: string
  /** Present when Kip proposed a JSON block */
  draftProposal?: unknown
}

export type DesignerAudience = "guest" | "keeper" | "admin"

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignerFrame({
  styleId: _styleId = "neutral",
  themeSlug: _themeSlug,
  domainSlug: propDomainSlug,
}: {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string
}) {
  const { isAdmin, isAuthenticated } = useAuth()
  const { domainSlug: ctxSlug, domainFrame: shellDomainFrame, styleId: shellStyleId, themeSlug: shellThemeSlug } = useV0Shell()
  const navigate = useNavigate()
  const domainSlug = propDomainSlug ?? ctxSlug ?? ""

  // ── Local live domain frame (separate from shell — reloads after publish) ──
  const [liveDomainFrame, setLiveDomainFrame] = React.useState<DomainFrameJson | null>(
    shellDomainFrame,
  )
  const [domainId, setDomainId] = React.useState<string | null>(null)

  // ── Designer state ──
  const [activeFrameKey, setActiveFrameKey] = React.useState<string | null>(null)
  const [messages, setMessages] = React.useState<DesignerMessage[]>([])
  const [audience, setAudience] = React.useState<DesignerAudience>(
    () => (isAuthenticated ? "keeper" : "guest"),
  )
  const [showRawJson, setShowRawJson] = React.useState(false)

  // ── Dialog state — the persistent container for this conversation ──
  const [dialogId, setDialogId] = React.useState<string | null>(null)

  // ── Draft state (lifted so all panels can read it) ──
  const [draftSpecJson, setDraftSpecJson] = React.useState<DomainFrameJson | null>(null)
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishSuccess, setPublishSuccess] = React.useState(false)

  // ── New panel state ──
  const [activeBoardId, setActiveBoardId] = React.useState("domain")
  const [leftCollapsed, setLeftCollapsed] = React.useState(false)
  const [density, setDensity] = React.useState<KeeperDensity>(readStoredDensity)
  const [briefOpen, setBriefOpen] = React.useState(false)

  // ── Sync live frame from shell on mount ──
  React.useEffect(() => {
    if (shellDomainFrame) setLiveDomainFrame(shellDomainFrame)
  }, [shellDomainFrame])

  // ── Load domain ID ──
  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    apiFetch(`/api/domains/by-slug/${domainSlug}`).then((res: any) => {
      if (ignore) return
      if (res?.id) setDomainId(res.id)
    }).catch(() => {})
    return () => { ignore = true }
  }, [domainSlug])

  // ── Sync audience when auth loads (one-time) ──
  const prevAuthRef = React.useRef<boolean | null>(null)
  React.useEffect(() => {
    if (prevAuthRef.current === false && isAuthenticated) {
      setAudience("keeper")
    }
    prevAuthRef.current = isAuthenticated
  }, [isAuthenticated])

  // ── Restore Dialog context when active frame changes ──
  // On every frame change: clear draft/publish state, then look up the
  // active Dialog for this domain + frame context. If one exists, load
  // its full message history so the conversation resumes after browser close.
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
      .then((res: any) => {
        if (cancelled) return
        const dialog = res?.dialog
        if (!dialog) return

        setDialogId(dialog.id)

        // Build DesignerMessage[] from kip_messages across all sessions
        const loaded: DesignerMessage[] = []
        const sessions: any[] = dialog.sessions ?? []
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
        // Not critical — start fresh if resolution fails
      })

    return () => { cancelled = true }
  }, [activeFrameKey, domainId])

  // ── Reload live frame JSON (called after publish) ──
  const reloadLiveFrame = React.useCallback(async () => {
    if (!domainSlug) return
    try {
      const frame = await loadDomainFrame(domainSlug)
      setLiveDomainFrame(frame)
    } catch {
      /* keep current */
    }
  }, [domainSlug])

  // ── Direct-edit handler (from Canvas click-to-edit) ──
  const handleDirectEdit = React.useCallback((updatedFrame: DomainFrameJson) => {
    setDraftSpecJson(updatedFrame)
    setDraftId(null)
    setPublishSuccess(false)
  }, [])

  // ── Publish handler ──
  const handlePublish = React.useCallback(async () => {
    if (!draftSpecJson || !domainId || isPublishing) return
    console.log("[publish] start", {
      draftSpecJson: !!draftSpecJson,
      draftId,
      domainId,
    })
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
      console.log("[publish] resolved draftId", resolvedDraftId)

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

  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", density)
    try {
      localStorage.setItem(DENSITY_STORAGE_KEY, density)
    } catch {
      /* ignore */
    }
  }, [density])

  // ── Frame select handler ──
  const handleFrameSelect = React.useCallback((key: string) => {
    setActiveFrameKey(key)
  }, [])

  // ── Derive active frame info from board data ──
  const activeFrameInfo = React.useMemo(() => {
    if (!activeFrameKey) return null
    const frames = BOARD_FRAMES[activeBoardId] ?? []
    return frames.find((f) => f.key === activeFrameKey) ?? null
  }, [activeFrameKey, activeBoardId])

  // ── Admin guard ──
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-50">
        <div className="rounded-xl border border-neutral-200 bg-white px-8 py-6 text-center shadow-sm">
          <p className="text-sm font-medium text-neutral-700">Access restricted</p>
          <p className="mt-1 text-xs text-neutral-400">
            Designer Frame is available to Platform Admins only.
          </p>
        </div>
      </div>
    )
  }

  return (
    <StyleScope
      styleId={shellStyleId ?? (_styleId as StyleId)}
      themeSlug={shellThemeSlug ?? _themeSlug ?? null}
      className="keeper-design-board-scope flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "#f5f2eb" }}
    >
      {/* Top bar */}
      <KeeperTopBar
        onDomainClick={() => {}}
        onBriefClick={() => setBriefOpen((o) => !o)}
        isBriefOpen={briefOpen}
      />
      {briefOpen && liveDomainFrame && (
        <DomainBriefSlideOver
          domainFrame={liveDomainFrame}
          onClose={() => setBriefOpen(false)}
        />
      )}

      {/* Density sub-bar */}
      <div
        className="shrink-0 flex items-center justify-end px-4 gap-1"
        style={{
          height: 34,
          borderBottom: "1px solid #e7e5e4",
          background: "#faf8f5",
        }}
      >
        <div
          className="flex items-center rounded-md overflow-hidden border text-[10px] font-medium"
          style={{ borderColor: "#d6d3d1", background: "#f5f2eb" }}
          role="group"
          aria-label="Display density"
        >
          {DENSITY_SEGMENTS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setDensity(key)}
              className="px-2 py-1 transition-colors whitespace-nowrap"
              style={{
                background: density === key ? "#ffffff" : "transparent",
                color: density === key ? "#1c1917" : "#57534e",
                boxShadow: density === key ? "inset 0 0 0 1px #d6d3d1" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden px-6 pb-8">

      {/* Left — Board & Template List */}
      <div
        className="flex flex-col border-r min-h-0 transition-all duration-200"
        style={{
          width: leftCollapsed ? 36 : 220,
          minWidth: leftCollapsed ? 36 : 220,
          borderColor: "#e7e5e4",
          background: "#fdfbf7",
          overflowY: "auto",
        }}
      >
        <DesignBoardList
          activeBoardId={activeBoardId}
          onSelectBoard={setActiveBoardId}
          collapsed={leftCollapsed}
          onToggleCollapsed={() => setLeftCollapsed((c) => !c)}
        />
      </div>

      {/* Center — Frame list + Kip chat */}
      <div
        className="flex flex-col border-r min-h-0"
        style={{
          flex: "1 1 0%",
          minWidth: 0,
          borderColor: "#e7e5e4",
          background: "#fefdfb",
          overflow: "hidden",
        }}
      >
        <DesignBoardFrameList
          activeBoardId={activeBoardId}
          activeFrameKey={activeFrameKey}
          onSelectFrame={handleFrameSelect}
          onClearFrameSelection={() => setActiveFrameKey(null)}
          domainId={domainId}
          domainSlug={domainSlug}
          liveDomainFrame={liveDomainFrame}
          draftSpecJson={draftSpecJson}
          messages={messages}
          setMessages={setMessages}
          draftId={draftId}
          setDraftId={setDraftId}
          setDraftSpecJson={setDraftSpecJson}
          hasDraftSpec={draftSpecJson !== null}
          isPublishing={isPublishing}
          publishSuccess={publishSuccess}
          onPublish={handlePublish}
          dialogId={dialogId}
          setDialogId={setDialogId}
        />
      </div>

      {/* Right — Frame detail (tabbed) */}
      <div
        className="flex flex-col"
        style={{
          width: "42%",
          minWidth: 320,
          background: "#f5f2eb",
          overflow: "hidden",
        }}
      >
        <DesignBoardFrameDetail
          domainSlug={domainSlug}
          activeFrameKey={activeFrameKey}
          activeFrameInfo={activeFrameInfo}
          liveDomainFrame={liveDomainFrame}
          draftSpecJson={draftSpecJson}
          audience={audience}
          setAudience={setAudience}
          onDirectEdit={handleDirectEdit}
        />
      </div>

      </div>
    </StyleScope>
  )
}

/** Named export alias used by BOARD_REGISTRY */
export { DesignerFrame as DesignBoard }
