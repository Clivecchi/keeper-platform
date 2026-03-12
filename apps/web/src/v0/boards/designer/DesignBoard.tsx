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

  return (
    <div
      className="flex h-screen w-full overflow-hidden"
      style={{ background: "hsl(var(--theme-surface-page, 0 0% 97%))" }}
    >
      {/* Left — Frame Navigator */}
      <div
        className="flex flex-col border-r"
        style={{
          width: 220,
          minWidth: 220,
          borderColor: "var(--theme-border-soft, #e5e7eb)",
          background: "hsl(var(--theme-surface-paper, 0 0% 100%))",
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
        className="flex flex-col border-r"
        style={{
          flex: "1 1 0%",
          minWidth: 0,
          borderColor: "var(--theme-border-soft, #e5e7eb)",
          background: "hsl(var(--theme-surface-paper, 0 0% 100%))",
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
          background: "hsl(var(--theme-surface-page, 0 0% 97%))",
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
  )
}

/** Named export alias used by BOARD_REGISTRY */
export { DesignerFrame as DesignBoard }
