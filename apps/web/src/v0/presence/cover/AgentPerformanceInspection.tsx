"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import {
  formatLayerStatus,
  buildInspectionFacts,
  type AgentPerformanceRow,
  type AgentPerformancesResponse,
  type InspectionFactTone,
} from "./agentPerformanceInspection"

export interface AgentPerformanceInspectionProps {
  agentId: string
  agentName: string
  configuredRole: string | null
  dialogId: string
  dialogTitle?: string | null
  onActivePerformanceChange?: (row: AgentPerformanceRow | null) => void
}

const TONE_COLOR: Record<InspectionFactTone, string> = {
  recorded: "hsl(var(--theme-ink-primary))",
  configured: "hsl(var(--theme-ink-secondary))",
  not_recorded: "hsl(var(--theme-ink-tertiary))",
}

function formatWhen(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function AgentPerformanceInspection({
  agentId,
  agentName,
  configuredRole,
  dialogId,
  dialogTitle,
  onActivePerformanceChange,
}: AgentPerformanceInspectionProps) {
  const [status, setStatus] = React.useState<"loading" | "ready" | "error">("loading")
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<AgentPerformanceRow[]>([])
  const [activeId, setActiveId] = React.useState<string | null>(null)
  const [resolvedDialogTitle, setResolvedDialogTitle] = React.useState(dialogTitle ?? "")

  const onActiveRef = React.useRef(onActivePerformanceChange)
  onActiveRef.current = onActivePerformanceChange

  React.useEffect(() => {
    let cancelled = false
    setStatus("loading")
    setErrorMessage(null)
    apiFetch(
      `/api/agents/${encodeURIComponent(agentId)}/performances?dialogId=${encodeURIComponent(dialogId)}`,
    )
      .then((res: unknown) => {
        if (cancelled) return
        const payload = res as AgentPerformancesResponse
        const list = Array.isArray(payload.performances) ? payload.performances : []
        setRows(list)
        setResolvedDialogTitle(payload.dialog?.title ?? dialogTitle ?? "")
        const first = list[0] ?? null
        setActiveId(first?.messageId ?? null)
        onActiveRef.current?.(first)
        setStatus("ready")
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message =
          err instanceof Error && err.message.trim() ? err.message : "Could not load performances"
        setErrorMessage(message)
        setRows([])
        setActiveId(null)
        onActiveRef.current?.(null)
        setStatus("error")
      })
    return () => {
      cancelled = true
    }
  }, [agentId, dialogId, dialogTitle])

  const active = rows.find((row) => row.messageId === activeId) ?? rows[0] ?? null
  const facts = active
    ? buildInspectionFacts(active.provenance, { name: agentName, role: configuredRole })
    : []

  return (
    <section
      className="mt-6 rounded-lg border px-3 py-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-elevated) / 0.22)",
      }}
      data-agent-performance-inspection=""
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-1"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Performance
      </p>
      <p
        className="text-[14px] font-medium mb-3"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {resolvedDialogTitle || "Selected Dialog"}
      </p>

      {status === "loading" && (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading recorded performances…
        </p>
      )}

      {status === "error" && (
        <p className="text-[13px]" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
          {errorMessage}
        </p>
      )}

      {status === "ready" && rows.length === 0 && (
        <p className="text-[13px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          No persisted performances for this Dialog yet. Older turns without session memory cannot
          be reconstructed here.
        </p>
      )}

      {status === "ready" && active && (
        <>
          {rows.length > 1 && (
            <label className="block mb-3">
              <span
                className="block text-[11px] uppercase tracking-widest mb-1"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Recorded turn
              </span>
              <select
                value={active.messageId}
                onChange={(event) => {
                  const next = rows.find((row) => row.messageId === event.target.value) ?? null
                  setActiveId(next?.messageId ?? null)
                  onActivePerformanceChange?.(next)
                }}
                className="w-full rounded-md border px-2 py-1.5 text-[13px] bg-transparent"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                  color: "hsl(var(--theme-ink-primary))",
                }}
              >
                {rows.map((row) => (
                  <option key={row.messageId} value={row.messageId}>
                    {formatWhen(row.createdAt)}
                    {row.preview ? ` — ${row.preview.slice(0, 48)}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          {active.provenance.source === "derived_from_legacy" && (
            <p
              className="text-[12px] leading-relaxed mb-3"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              This turn predates named provenance. Facts below are reconstructed from saved
              metadata. Layers not stored on the turn are marked not recorded — not the same as
              current runtime behavior.
            </p>
          )}

          <dl className="space-y-2 mb-4">
            {facts.map((fact) => (
              <div key={fact.label} className="flex gap-3">
                <dt
                  className="w-[7.5rem] shrink-0 text-[11px] uppercase tracking-wider pt-0.5"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {fact.label}
                </dt>
                <dd className="text-[13px] leading-snug" style={{ color: TONE_COLOR[fact.tone] }}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>

          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Runtime layers
          </p>
          <ul className="space-y-1.5">
            {active.provenance.layers.map((layer) => (
              <li key={layer.key} className="flex gap-3 text-[13px] leading-snug">
                <span
                  className="w-[7.5rem] shrink-0"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {layer.label}
                </span>
                <span style={{ color: TONE_COLOR[layer.status === "recorded" ? "recorded" : "not_recorded"] }}>
                  {layer.detail
                    ? `${formatLayerStatus(layer.status)} · ${layer.detail}`
                    : formatLayerStatus(layer.status)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
