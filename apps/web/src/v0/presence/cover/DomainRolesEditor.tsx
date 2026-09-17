"use client"

import * as React from "react"
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline"
import {
  ROLE_MAP,
  type DomainRole,
  type DomainRoleCatalogEntry,
} from "@keeper/shared"

export interface DomainRolesEditorProps {
  roles: DomainRoleCatalogEntry[]
  busyKey: string | null
  onSave: (entry: DomainRoleCatalogEntry, draft: RoleDraft) => Promise<void>
  onCreate: (draft: RoleDraft) => Promise<void>
  onDelete: (entry: DomainRoleCatalogEntry) => Promise<void>
}

export interface RoleDraft {
  label: string
  description: string
  mapsTo: DomainRole
}

const quietStyle: React.CSSProperties = {
  color: "hsl(var(--theme-ink-secondary))",
}

const inputStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "var(--treatment-paper, hsl(var(--theme-surface-paper)))",
  color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
}

const actionOutlineStyle: React.CSSProperties = {
  border: "1px solid var(--treatment-accent, hsl(var(--theme-border-soft)))",
  color: "var(--treatment-accent, hsl(var(--theme-ink-primary)))",
  background: "transparent",
}

const actionFilledStyle: React.CSSProperties = {
  border: "1px solid var(--treatment-action, hsl(var(--theme-accent-primary)))",
  background: "var(--treatment-action, hsl(var(--theme-accent-primary)))",
  color: "var(--treatment-action-ink, hsl(var(--theme-surface-paper)))",
}

const PLATFORM_BUNDLES = Object.entries(ROLE_MAP) as Array<[DomainRole, { label: string }]>

function draftFromEntry(entry: DomainRoleCatalogEntry): RoleDraft {
  return {
    label: entry.label,
    description: entry.description,
    mapsTo: entry.mapsTo ?? "connection",
  }
}

export function DomainRolesEditor({
  roles,
  busyKey,
  onSave,
  onCreate,
  onDelete,
}: DomainRolesEditorProps) {
  const [editingKey, setEditingKey] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [draft, setDraft] = React.useState<RoleDraft>({
    label: "",
    description: "",
    mapsTo: "connection",
  })

  const startEdit = (entry: DomainRoleCatalogEntry) => {
    setAdding(false)
    setEditingKey(entry.key)
    setDraft(draftFromEntry(entry))
  }

  const startAdd = () => {
    setEditingKey(null)
    setAdding(true)
    setDraft({ label: "", description: "", mapsTo: "connection" })
  }

  const cancel = () => {
    setEditingKey(null)
    setAdding(false)
  }

  return (
    <div className="space-y-1.5">
      {roles.map((entry) => {
        const editing = editingKey === entry.key
        const busy = busyKey === entry.key
        if (editing) {
          return (
            <RoleDraftFields
              key={entry.key}
              draft={draft}
              busy={busy}
              showBundle={entry.kind === "custom"}
              saveLabel={busy ? "Saving…" : "Save"}
              onChange={setDraft}
              onCancel={cancel}
              onSave={() => void onSave(entry, draft).then(cancel).catch(() => undefined)}
            />
          )
        }
        return (
          <div key={entry.key} className="flex items-start justify-between gap-3">
            <p className="text-[12px] min-w-0" style={quietStyle}>
              <span className="font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                {entry.label}
              </span>
              {" — "}
              {entry.description}
              {entry.kind === "custom" && entry.mapsTo ? (
                <span className="block text-[11px] mt-0.5">
                  Uses {ROLE_MAP[entry.mapsTo].label} permissions.
                </span>
              ) : null}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(entry)}
                className="rounded-md p-1"
                style={quietStyle}
                aria-label={`Edit ${entry.label}`}
              >
                <PencilSquareIcon className="w-3.5 h-3.5" />
              </button>
              {entry.locked ? null : (
                <button
                  type="button"
                  onClick={() => void onDelete(entry)}
                  disabled={busy}
                  className="rounded-md p-1 disabled:opacity-50"
                  style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                  aria-label={`Remove ${entry.label}`}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )
      })}

      {adding ? (
        <RoleDraftFields
          draft={draft}
          busy={busyKey === "new"}
          showBundle
          saveLabel={busyKey === "new" ? "Adding…" : "Add role"}
          onChange={setDraft}
          onCancel={cancel}
          onSave={() => void onCreate(draft).then(cancel).catch(() => undefined)}
        />
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="inline-flex items-center gap-1 pt-1 text-[12px] font-medium"
          style={quietStyle}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add role
        </button>
      )}
    </div>
  )
}

function RoleDraftFields({
  draft,
  busy,
  showBundle,
  saveLabel,
  onChange,
  onCancel,
  onSave,
}: {
  draft: RoleDraft
  busy: boolean
  showBundle: boolean
  saveLabel: string
  onChange: (draft: RoleDraft) => void
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="space-y-2 rounded-md p-2" style={inputStyle}>
      <input
        value={draft.label}
        onChange={(event) => onChange({ ...draft, label: event.target.value })}
        className="w-full rounded-md px-2 py-1.5 text-[13px]"
        style={inputStyle}
        placeholder="Role name"
        disabled={busy}
      />
      <textarea
        value={draft.description}
        onChange={(event) => onChange({ ...draft, description: event.target.value })}
        rows={2}
        className="w-full rounded-md px-2 py-1.5 text-[12px] resize-y"
        style={inputStyle}
        placeholder="What this relationship means here."
        disabled={busy}
      />
      {showBundle ? (
        <label className="flex flex-col gap-1 text-[11px]" style={quietStyle}>
          Uses these permissions
          <select
            value={draft.mapsTo}
            onChange={(event) => onChange({ ...draft, mapsTo: event.target.value as DomainRole })}
            className="rounded-md px-2 py-1.5 text-[12px]"
            style={inputStyle}
            disabled={busy}
          >
            {PLATFORM_BUNDLES.map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !draft.label.trim()}
          className="rounded-md px-2 py-1 text-xs font-semibold disabled:opacity-50"
          style={actionFilledStyle}
        >
          {saveLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs"
          style={actionOutlineStyle}
        >
          <XMarkIcon className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>
    </div>
  )
}
