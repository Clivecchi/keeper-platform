"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraft, KipDraftStatus } from "../../../lib/kipApi"
import { DraftCard } from "../../../components/agent/DraftCard"
import type { DraftSpec } from "../../../components/agent/DraftCard"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgentBoardPanelProps {
  /** Board-determined view mode. The Board, not the panel, decides what to render. */
  mode: "draft" | "agent"
  agentId?: string | null
  draftId?: string | null
  domainId?: string | null
  domainSlug: string
  onClearDraft?: () => void
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentDetail = {
  id: string
  name: string
  slug: string | null
  model: string | null
  model_provider: string | null
  purpose: string | null
  status: string | null
  agent_class: string | null
}

// ─── Banner ───────────────────────────────────────────────────────────────────

function PanelBanner({ label, title }: { label: string; title?: string }) {
  return (
    <div
      className="shrink-0 px-4 py-3 border-b"
      style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {label}
      </p>
      {title && (
        <p
          className="text-[13px] font-medium mt-0.5 truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {title}
        </p>
      )}
    </div>
  )
}

// ─── Draft view ───────────────────────────────────────────────────────────────

function DraftView({
  draftId,
  domainId,
  onBack,
}: {
  draftId: string
  domainId: string
  onBack: () => void
}) {
  const [draft, setDraft]       = React.useState<KipDraft | null>(null)
  const [loading, setLoading]   = React.useState(true)
  const [saving, setSaving]     = React.useState(false)
  const [error, setError]       = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    KipApi.getDraft(domainId, draftId)
      .then((d) => { if (!cancelled) setDraft(d) })
      .catch(() => { if (!cancelled) setError("Could not load draft.") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [draftId, domainId])

  const handleSave = async (payload: {
    title: string
    summary: string | null
    status: KipDraftStatus
    spec: DraftSpec
  }) => {
    if (!draft) return
    setSaving(true)
    setError(null)
    try {
      const updated = await KipApi.updateDraft(domainId, draft.id, {
        title: payload.title,
        summary: payload.summary ?? undefined,
        status: payload.status,
        spec: payload.spec,
      })
      setDraft(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save draft")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        <PanelBanner label="Draft" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Loading…
          </p>
        </div>
      </div>
    )
  }

  if (error || !draft) {
    return (
      <div className="flex flex-col h-full" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        <PanelBanner label="Draft" />
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[12px] text-center" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {error ?? "Draft not found."}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ color: "hsl(var(--theme-ink-primary))" }}>
      <PanelBanner label="Draft" title={draft.title} />
      <div className="keeper-panel-scroll flex-1 overflow-y-auto">
        <DraftCard
          draft={draft}
          isSaving={saving}
          error={error}
          onSave={handleSave}
          onBackToDialogue={onBack}
        />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoardPanel({ mode, agentId, draftId, domainId, onClearDraft }: AgentBoardPanelProps) {
  if (mode === "draft") {
    if (!draftId || !domainId) {
      return (
        <div className="flex flex-col h-full" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          <PanelBanner label="Draft" />
          <div className="flex-1 flex items-center justify-center px-4">
            <p className="text-[12px] text-center" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Loading…
            </p>
          </div>
        </div>
      )
    }
    return (
      <DraftView
        draftId={draftId}
        domainId={domainId}
        onBack={onClearDraft ?? (() => {})}
      />
    )
  }

  return <AgentView agentId={agentId ?? null} />
}

// ─── Agent view (extracted to keep component tree clean) ─────────────────────

function AgentView({ agentId }: { agentId: string | null }) {
  const [agent, setAgent]     = React.useState<AgentDetail | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError]     = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!agentId) {
      setAgent(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    apiFetch(`/api/agents/${encodeURIComponent(agentId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        setAgent(res as AgentDetail)
      })
      .catch(() => {
        if (!cancelled) setError("Could not load agent.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [agentId])

  if (loading) {
    return (
      <div className="flex flex-col h-full" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        <PanelBanner label="Agent" />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Loading…
          </p>
        </div>
      </div>
    )
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col h-full" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        <PanelBanner label="Agent" />
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-[12px] text-center" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            {error ?? "Agent not found."}
          </p>
        </div>
      </div>
    )
  }

  const isReady = agent.status === "ready" || agent.status === "active"

  return (
    <div className="flex flex-col h-full" style={{ color: "hsl(var(--theme-ink-primary))" }}>
      <PanelBanner label="Agent" title={agent.name} />

      <div className="keeper-panel-scroll flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* Name */}
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Name
          </p>
          <p
            className="text-[15px] font-semibold leading-snug"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {agent.name}
          </p>
          {agent.slug && (
            <p
              className="text-[11px] font-mono mt-0.5"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {agent.slug}
            </p>
          )}
        </div>

        {/* Model */}
        {(agent.model || agent.model_provider) && (
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Model
            </p>
            {agent.model && (
              <p className="font-mono text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                {agent.model}
              </p>
            )}
            {agent.model_provider && (
              <p className="text-[11px] mt-0.5" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {agent.model_provider}
              </p>
            )}
          </div>
        )}

        {/* Scope / Purpose */}
        {agent.purpose && (
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Scope
            </p>
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {agent.purpose}
            </p>
          </div>
        )}

        {/* Status */}
        <div
          className="border-t pt-3"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full shrink-0"
              style={{
                background: isReady
                  ? "hsl(142 71% 45%)"
                  : "hsl(var(--theme-ink-tertiary))",
              }}
            />
            <span
              className="text-[12px] font-medium"
              style={{
                color: isReady
                  ? "hsl(142 60% 30%)"
                  : "hsl(var(--theme-ink-tertiary))",
              }}
            >
              {isReady ? "Ready" : (agent.status ?? "Unknown")}
            </span>
          </div>
        </div>

        {/* Configure button */}
        <div
          className="border-t pt-3"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        >
          <button
            type="button"
            disabled
            className="w-full rounded-md px-3 py-2 text-[12px] font-medium border transition-opacity opacity-50 cursor-not-allowed"
            style={{
              borderColor: "hsl(var(--theme-line-hairline))",
              color: "hsl(var(--theme-ink-secondary))",
              background: "hsl(var(--theme-surface-elevated))",
            }}
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  )
}
