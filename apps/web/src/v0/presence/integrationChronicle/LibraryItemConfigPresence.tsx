"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/apiFetch"
import { KipApi } from "../../../lib/kipApi"
import { ChronicleConfigShell, useChronicleConfig } from "../chronicleConfig/useChronicleConfig"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import { libraryItemChronicleTitle } from "./libraryNavUtils"
import type { LibraryItemDto } from "./feeds/LibraryItemFeed"

type KeeperOption = { id: string; title: string }
type AgentOption = { id: string; name: string }

export type LibraryMetadataFields = {
  display_label: string
  description: string
  assigned_keeper_id: string
  assigned_agent_id: string
}

function toMetadataFields(item: LibraryItemDto): LibraryMetadataFields {
  return {
    display_label: item.display_label?.trim() ?? libraryItemChronicleTitle(item),
    description: item.description ?? "",
    assigned_keeper_id: item.assigned_keeper_id ?? "",
    assigned_agent_id: item.assigned_agent_id ?? "",
  }
}

export function LibraryItemConfigPresence({
  libraryItemId,
  domainId,
  item,
  onBack,
  onRefresh,
  onLabelResolved,
}: {
  libraryItemId: string
  domainId: string
  item: LibraryItemDto
  onBack: () => void
  onRefresh?: () => void
  onLabelResolved?: (label: string) => void
}) {
  const board = useUniversalBoardOptional()
  const baselineRef = React.useRef(toMetadataFields(item))
  const [fieldValues, setFieldValues] = React.useState(baselineRef.current)
  const fieldValuesRef = React.useRef(fieldValues)
  fieldValuesRef.current = fieldValues

  const [keepers, setKeepers] = React.useState<KeeperOption[]>([])
  const [agents, setAgents] = React.useState<AgentOption[]>([])

  React.useEffect(() => {
    const next = toMetadataFields(item)
    baselineRef.current = next
    setFieldValues(next)
  }, [libraryItemId, item])

  React.useEffect(() => {
    let cancelled = false
    async function loadOptions() {
      try {
        const [keeperRes, agentRows] = await Promise.all([
          apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}&limit=100`),
          KipApi.getDomainAgents(domainId),
        ])
        if (cancelled) return
        const keeperList =
          (keeperRes as { data?: KeeperOption[] })?.data ??
          (keeperRes as { keepers?: KeeperOption[] })?.keepers ??
          (Array.isArray(keeperRes) ? keeperRes : [])
        setKeepers(Array.isArray(keeperList) ? keeperList : [])
        setAgents(
          agentRows.map((agent) => ({
            id: agent.id,
            name: agent.name,
          })),
        )
      } catch {
        if (!cancelled) {
          setKeepers([])
          setAgents([])
        }
      }
    }
    void loadOptions()
    return () => {
      cancelled = true
    }
  }, [domainId])

  const chronicleConfig = useChronicleConfig({
    entityKind: "library",
    entityId: libraryItemId,
    domainId,
    buildPayload: () => {
      const baseline = baselineRef.current
      const current = fieldValuesRef.current
      const patch: Record<string, string | null> = {}
      if (current.display_label.trim() !== baseline.display_label.trim()) {
        patch.display_label = current.display_label.trim()
      }
      if (current.description !== baseline.description) {
        patch.description = current.description
      }
      const keeperId = current.assigned_keeper_id.trim()
      const baselineKeeper = baseline.assigned_keeper_id.trim()
      if (keeperId !== baselineKeeper) {
        patch.assigned_keeper_id = keeperId || null
      }
      const agentId = current.assigned_agent_id.trim()
      const baselineAgent = baseline.assigned_agent_id.trim()
      if (agentId !== baselineAgent) {
        patch.assigned_agent_id = agentId || null
      }
      if (Object.keys(patch).length === 0) return null
      return patch
    },
    validate: () => {
      if (fieldValuesRef.current.display_label.trim().length === 0) {
        return "Display label is required."
      }
      return null
    },
    onSaved: (field, value) => {
      if (typeof value === "string") {
        baselineRef.current = { ...baselineRef.current, [field]: value }
      } else if (value === null) {
        if (field === "assigned_keeper_id" || field === "assigned_agent_id") {
          baselineRef.current = { ...baselineRef.current, [field]: "" }
        }
      }
      if (field === "display_label" && typeof value === "string") {
        onLabelResolved?.(value)
      }
      board?.actions.bumpLibraryNav({
        libraryItemId,
        ...(field === "display_label" && typeof value === "string"
          ? { display_label: value }
          : {}),
        ...(field === "description" && typeof value === "string"
          ? { description: value }
          : {}),
      })
    },
    onRefresh,
  })

  const handleFieldChange = React.useCallback(
    (fieldKey: keyof LibraryMetadataFields, value: string) => {
      chronicleConfig.markEdited()
      setFieldValues((prev) => ({ ...prev, [fieldKey]: value }))
    },
    [chronicleConfig],
  )

  const inputStyle: React.CSSProperties = {
    borderColor: "hsl(var(--theme-border-soft) / 0.5)",
    background: "hsl(var(--theme-surface-panel) / 0.35)",
    color: "hsl(var(--theme-ink-primary))",
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: fieldValues.display_label || libraryItemChronicleTitle(item),
        status: item.source_type,
      }}
      onBack={onBack}
      saveStatus={chronicleConfig.saveStatus}
      saveMessage={chronicleConfig.saveMessage}
      isDirty={chronicleConfig.isDirty}
      onSave={() => void chronicleConfig.handleSave()}
      onDismissError={chronicleConfig.dismissSaveError}
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Source type (read-only)
          </label>
          <input readOnly value={item.source_type} className="w-full rounded-md border px-3 py-2 text-[13px] capitalize opacity-70" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Source ref (read-only)
          </label>
          <textarea readOnly value={item.source_ref} rows={2} className="w-full rounded-md border px-3 py-2 text-[12px] font-mono opacity-70 resize-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Display label
          </label>
          <input
            value={fieldValues.display_label}
            onChange={(e) => handleFieldChange("display_label", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-[13px]"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Description
          </label>
          <textarea
            value={fieldValues.description}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            rows={3}
            className="w-full rounded-md border px-3 py-2 text-[13px] resize-y"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Assigned Keeper
          </label>
          <select
            value={fieldValues.assigned_keeper_id}
            onChange={(e) => handleFieldChange("assigned_keeper_id", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            <option value="">— None —</option>
            {keepers.map((keeper) => (
              <option key={keeper.id} value={keeper.id}>
                {keeper.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Assigned Agent
          </label>
          <select
            value={fieldValues.assigned_agent_id}
            onChange={(e) => handleFieldChange("assigned_agent_id", e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-[13px]"
            style={inputStyle}
          >
            <option value="">— None —</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Agent perspective (read-only)
          </label>
          <textarea
            readOnly
            value={item.agent_perspective ?? ""}
            rows={4}
            className="w-full rounded-md border px-3 py-2 text-[13px] opacity-80 resize-none"
            style={inputStyle}
          />
        </div>
      </div>
    </ChronicleConfigShell>
  )
}
