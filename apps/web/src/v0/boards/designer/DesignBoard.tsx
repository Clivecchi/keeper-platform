"use client"

/**
 * DesignBoard (was DesignerFrame)
 *
 * Platform Admin–only surface. Three panels at full viewport height:
 *   Left   — DesignBoardNav   (frame list + live/draft status)
 *   Center — DesignBoardKip   (Kip conversation for the active frame)
 *   Right  — DesignBoardCanvas (live/draft frame preview + JSON toggle)
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
import { DesignerFrameNav } from "./DesignBoardNav"
import { DesignerFrameKip } from "./DesignBoardKip"
import { DesignerFramePreview } from "./DesignBoardCanvas"

// ─── Banner ───────────────────────────────────────────────────────────────────
// Domain wordmark + navigation chrome. Sits above the three-panel layout as
// the top chrome for the Designer Board — mirrors the domain branding visible
// in the standard authenticated frame experience.

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
      {/* Left: back button + domain wordmark */}
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

      {/* Right: Designer badge */}
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
  const { isAdmin } = useAuth()
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
  const [audience, setAudience] = React.useState<DesignerAudience>("guest")
  const [showRawJson, setShowRawJson] = React.useState(false)

  // ── Draft state (lifted so all panels can read it) ──
  const [draftSpecJson, setDraftSpecJson] = React.useState<unknown | null>(null)
  const [draftId, setDraftId] = React.useState<string | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishSuccess, setPublishSuccess] = React.useState(false)

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

  // ── Publish handler ──
  const handlePublish = React.useCallback(async () => {
    if (!draftId || !domainId || isPublishing) return
    setIsPublishing(true)
    try {
      await KipApi.publishDraft(domainId, draftId)
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
  }, [draftId, domainId, isPublishing, reloadLiveFrame])

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
    navigate(`/d/${domainSlug}/board`)
  }

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "#f9fafb" }}
    >
      {/* Top — Domain banner (wordmark + navigation chrome) */}
      <DesignBoardBanner
        domainSlug={domainSlug}
        wordmark={wordmark}
        onBack={handleBack}
      />

      {/* Three-panel layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

      {/* Left — Frame Navigator */}
      <div
        className="flex flex-col border-r min-h-0"
        style={{
          width: 220,
          minWidth: 220,
          borderColor: "#e5e7eb",
          background: "#ffffff",
          overflowY: "auto",
        }}
      >
        <DesignerFrameNav
          liveDomainFrame={liveDomainFrame}
          activeFrameKey={activeFrameKey}
          onSelectFrame={setActiveFrameKey}
        />
      </div>

      {/* Center — Kip conversation */}
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
        <DesignerFrameKip
          domainId={domainId}
          domainSlug={domainSlug}
          activeFrameKey={activeFrameKey}
          liveDomainFrame={liveDomainFrame}
          messages={messages}
          setMessages={setMessages}
          draftId={draftId}
          setDraftId={setDraftId}
          setDraftSpecJson={setDraftSpecJson}
          isPublishing={isPublishing}
          publishSuccess={publishSuccess}
          onPublish={handlePublish}
        />
      </div>

      {/* Right — Live / Draft preview */}
      <div
        className="flex flex-col"
        style={{
          width: "42%",
          minWidth: 320,
          background: "#f9fafb",
          overflow: "hidden",
        }}
      >
        <DesignerFramePreview
          domainSlug={domainSlug}
          activeFrameKey={activeFrameKey}
          liveDomainFrame={liveDomainFrame}
          draftSpecJson={draftSpecJson}
          audience={audience}
          setAudience={setAudience}
          showRawJson={showRawJson}
          setShowRawJson={setShowRawJson}
        />
      </div>

      </div>
    </div>
  )
}

/** Named export alias used by BOARD_REGISTRY */
export { DesignerFrame as DesignBoard }
