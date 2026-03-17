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
import { V0_MARGIN_HEIGHT } from "../../components/Margin"
import { DesignBoardList } from "./DesignBoardList"
import { DesignBoardFrameList, BOARD_FRAMES } from "./DesignBoardFrameList"
import { DesignBoardFrameDetail } from "./DesignBoardFrameDetail"

// ─── Banner ───────────────────────────────────────────────────────────────────

function DesignBoardBanner({
  domainSlug,
  wordmark,
  onBack,
}: {
  domainSlug: string
  wordmark: string
  onBack: () => void
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-between px-5"
      style={{
        height: 56,
        borderBottom: "1px solid #e5e7eb",
        background: "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to domain board"
          className="shrink-0 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-100"
          style={{ color: "#374151" }}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back
        </button>
        <div className="h-4 w-px bg-gray-200 shrink-0" />
        <span
          className="text-[12px] font-medium truncate"
          style={{ color: "#6b7280" }}
        >
          {domainSlug}
        </span>
        <span
          className="font-serif text-[18px] font-semibold leading-tight truncate"
          style={{ color: "#111827" }}
        >
          {wordmark}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span
          className="rounded-md px-3 py-1 text-[11px] font-bold uppercase tracking-widest"
          style={{
            background: "#111827",
            color: "#ffffff",
          }}
        >
          Designer
        </span>
      </div>
    </div>
  )
}

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
  const { domainSlug: ctxSlug, domainFrame: shellDomainFrame } = useV0Shell()
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

  // ── Draft state (lifted so all panels can read it) ──
  const [draftSpecJson, setDraftSpecJson] = React.useState<DomainFrameJson | null>(null)
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishSuccess, setPublishSuccess] = React.useState(false)

  // ── New panel state ──
  const [activeBoardId, setActiveBoardId] = React.useState("domain")
  const [leftCollapsed, setLeftCollapsed] = React.useState(false)

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

  // ── Reset conversation when active frame changes ──
  React.useEffect(() => {
    setMessages([])
    setDraftSpecJson(null)
    setDraftId(null)
    setPublishSuccess(false)
  }, [activeFrameKey])

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
    setIsPublishing(true)
    try {
      let resolvedDraftId = draftId
      if (!resolvedDraftId) {
        const draft = await KipApi.createDraft(domainId, {
          kind: "domain_json",
          key: `direct-edit-${Date.now()}`,
          title: "Direct edit",
          spec: draftSpecJson as Record<string, unknown>,
        })
        resolvedDraftId = draft.id
        setDraftId(resolvedDraftId)
      }
      await KipApi.publishDraft(domainId, resolvedDraftId)
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

  // ── Frame select handler — auto-collapses left panel ──
  const handleFrameSelect = React.useCallback((key: string) => {
    setActiveFrameKey(key)
    setLeftCollapsed(true)
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

  const wordmark = liveDomainFrame?.theme?.wordmark ?? domainSlug

  const handleBack = () => {
    navigate(`/d/${domainSlug}`)
  }

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "#f9fafb" }}
    >
      {/* Top — Domain banner */}
      <DesignBoardBanner
        domainSlug={domainSlug}
        wordmark={wordmark}
        onBack={handleBack}
      />

      {/* Three-panel layout */}
      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ paddingBottom: V0_MARGIN_HEIGHT }}
      >

      {/* Left — Board & Template List */}
      <div
        className="flex flex-col border-r min-h-0 transition-all duration-200"
        style={{
          width: leftCollapsed ? 36 : 220,
          minWidth: leftCollapsed ? 36 : 220,
          borderColor: "#e5e7eb",
          background: "#ffffff",
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
          borderColor: "#e5e7eb",
          background: "#ffffff",
          overflow: "hidden",
        }}
      >
        <DesignBoardFrameList
          activeBoardId={activeBoardId}
          activeFrameKey={activeFrameKey}
          onSelectFrame={handleFrameSelect}
          domainId={domainId}
          domainSlug={domainSlug}
          liveDomainFrame={liveDomainFrame}
          messages={messages}
          setMessages={setMessages}
          draftId={draftId}
          setDraftId={setDraftId}
          setDraftSpecJson={setDraftSpecJson}
          hasDraftSpec={draftSpecJson !== null}
          isPublishing={isPublishing}
          publishSuccess={publishSuccess}
          onPublish={handlePublish}
        />
      </div>

      {/* Right — Frame detail (tabbed) */}
      <div
        className="flex flex-col"
        style={{
          width: "42%",
          minWidth: 320,
          background: "#f9fafb",
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
    </div>
  )
}

/** Named export alias used by BOARD_REGISTRY */
export { DesignerFrame as DesignBoard }
