"use client"

import * as React from "react"
import type { CapabilityUsedByEntry } from "../feeds/CapabilityFeed"
import {
  createCapabilityGrant,
  deleteCapabilityGrant,
  fetchAgentPickerOptions,
  type AgentPickerOption,
} from "../capabilityGrantUtils"

const blockShellClass = "rounded-md border px-3 py-3"
const blockShellStyle = {
  borderColor: "hsl(var(--theme-border-soft) / 0.45)",
  background: "hsl(var(--theme-surface-elevated) / 0.12)",
}

export function CapabilityUsedByGrantsBlock({
  capabilityId,
  usedBy,
  onChanged,
}: {
  capabilityId: string
  usedBy: CapabilityUsedByEntry[]
  onChanged: () => Promise<void>
}) {
  const [agents, setAgents] = React.useState<AgentPickerOption[]>([])
  const [selectedAgentId, setSelectedAgentId] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    void fetchAgentPickerOptions()
      .then((rows) => {
        if (!cancelled) setAgents(rows)
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load agents")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const grantedIds = React.useMemo(
    () => new Set(usedBy.map((entry) => entry.agentId)),
    [usedBy],
  )

  const addableAgents = React.useMemo(
    () => agents.filter((agent) => !grantedIds.has(agent.id)),
    [agents, grantedIds],
  )

  const handleAdd = React.useCallback(async () => {
    if (!selectedAgentId) return
    setBusy(true)
    setError(null)
    try {
      await createCapabilityGrant(capabilityId, selectedAgentId)
      setSelectedAgentId("")
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add grant")
    } finally {
      setBusy(false)
    }
  }, [capabilityId, onChanged, selectedAgentId])

  const handleRemove = React.useCallback(
    async (agentId: string) => {
      setBusy(true)
      setError(null)
      try {
        await deleteCapabilityGrant(capabilityId, agentId)
        await onChanged()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove grant")
      } finally {
        setBusy(false)
      }
    },
    [capabilityId, onChanged],
  )

  return (
    <div className={blockShellClass} style={blockShellStyle}>
      <p
        className="text-[11px] font-medium uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        Used by
      </p>

      {usedBy.length === 0 ? (
        <p className="text-[13px] italic mb-3" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No agents have a grant for this capability.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 mb-3">
          {usedBy.map((entry) => (
            <li
              key={`${entry.agentId}-${entry.source}`}
              className="flex items-center justify-between gap-2"
            >
              <div className="text-[13px] flex flex-wrap items-baseline gap-x-2 min-w-0">
                <span className="font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                  {entry.agentName}
                </span>
                <span
                  className="text-[11px] font-mono"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {entry.agentSlug} · {entry.source}
                </span>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemove(entry.agentId)}
                className="shrink-0 text-[11px] px-2 py-1 rounded border"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                  color: "hsl(var(--theme-ink-secondary))",
                }}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}>
        <label
          className="text-[10px] font-mono uppercase tracking-wider"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Add agent
        </label>
        <div className="flex gap-2">
          <select
            value={selectedAgentId}
            disabled={busy || addableAgents.length === 0}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="flex-1 rounded-md border px-3 py-2 text-[13px] min-w-0"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.5)",
              background: "hsl(var(--theme-surface-panel) / 0.35)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          >
            <option value="">
              {addableAgents.length === 0 ? "All agents already granted" : "Select agent…"}
            </option>
            {addableAgents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name} ({agent.slug})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !selectedAgentId}
            onClick={() => void handleAdd()}
            className="shrink-0 text-[12px] px-3 py-2 rounded border font-medium"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.5)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          >
            Add
          </button>
        </div>
      </div>

      {error && (
        <p className="text-[12px] mt-2" style={{ color: "hsl(var(--theme-status-error, 0 80% 55%))" }}>
          {error}
        </p>
      )}
    </div>
  )
}
