"use client"

import * as React from "react"
import { PencilIcon, TrashIcon } from "@heroicons/react/24/outline"
import { apiFetch } from "../../../lib/api"
import {
  patchVoicePromptSection,
  parseCapabilityLines,
  parseIdentitySection,
  parseRuleLines,
  serializeCapabilityLines,
  serializeIdentitySection,
  serializeRuleLines,
  type CapabilityItem,
  type VoicePromptSectionKey,
} from "./voicePromptSections"

export type SectionSaveStatus = "idle" | "saving" | "saved" | "error"

export interface TrainingPlatformData {
  domain: string
  model: string
  status: string
  visibility: string
  memory: string
}

interface SectionEditorBaseProps {
  sectionKey: VoicePromptSectionKey
  label: string
  content: string
  voicePrompt: string
  objectId: string
  domainId: string
  onVoicePromptSaved: (next: string) => void
  defaultOpen?: boolean
}

const monoInputClass =
  "w-full resize-y rounded-md border px-3 py-2.5 font-mono text-[14px] leading-relaxed bg-transparent outline-none"

const inputStyle = {
  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
  color: "hsl(var(--theme-ink-primary))",
} as const

function useSectionSave({
  sectionKey,
  voicePrompt,
  objectId,
  domainId,
  onVoicePromptSaved,
}: Pick<
  SectionEditorBaseProps,
  "sectionKey" | "voicePrompt" | "objectId" | "domainId" | "onVoicePromptSaved"
>) {
  const [saveStatus, setSaveStatus] = React.useState<SectionSaveStatus>("idle")
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (saveStatus !== "saved") return
    const timer = window.setTimeout(() => {
      setSaveStatus("idle")
      setSaveMessage(null)
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [saveStatus])

  const saveSection = React.useCallback(
    async (serialized: string) => {
      const trimmed = serialized.trim()
      if (trimmed.length > 0 && trimmed.length < 10) {
        setSaveStatus("error")
        setSaveMessage("Section must be at least 10 characters, or leave empty.")
        return
      }

      const nextPrompt = patchVoicePromptSection(voicePrompt, sectionKey, trimmed)
      setSaveStatus("saving")
      setSaveMessage(null)

      try {
        await apiFetch(`/api/agents/${encodeURIComponent(objectId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domainId, lensSystemPrompt: nextPrompt }),
        })
        onVoicePromptSaved(nextPrompt)
        setSaveStatus("saved")
        setSaveMessage("Saved")
      } catch (err: unknown) {
        const message =
          typeof (err as { data?: { error?: string } })?.data?.error === "string"
            ? (err as { data: { error: string } }).data.error
            : "Save failed"
        setSaveStatus("error")
        setSaveMessage(message)
      }
    },
    [sectionKey, voicePrompt, objectId, domainId, onVoicePromptSaved],
  )

  return { saveStatus, saveMessage, saveSection }
}

function SectionShell({
  label,
  defaultOpen = false,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = React.useState(defaultOpen)

  return (
    <div
      className="rounded-lg border overflow-hidden mb-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left"
        style={{ background: "hsl(var(--theme-surface-elevated) / 0.12)" }}
      >
        <span
          className="text-[13px] font-semibold"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {label}
        </span>
        <span className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {open ? "Hide" : "Show"}
        </span>
      </button>
      {open && (
        <div
          className="px-3 py-3 border-t"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function FieldLabel({ label, subtitle }: { label: string; subtitle?: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-[12px] font-semibold" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {label}
      </p>
      {subtitle && (
        <p className="text-[11px] mt-0.5 leading-relaxed" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

export function ProposalScaffold({
  additions = ["Example addition from Kip (scaffold)"],
  removals = ["Example removal (scaffold)"],
  onAccept,
}: {
  additions?: string[]
  removals?: string[]
  onAccept?: (addition: string) => void
}) {
  const [dismissed, setDismissed] = React.useState(false)
  if (dismissed) return null

  const nextAddition = additions[0]

  return (
    <div
      className="mt-3 rounded-lg border px-3 py-2.5"
      style={{
        borderColor: "hsl(var(--theme-status-success, 152 69% 43%) / 0.35)",
        background: "hsl(var(--theme-surface-elevated) / 0.2)",
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "hsl(var(--theme-status-success, 152 69% 43%))" }}
      >
        Kip suggested
      </p>
      <div className="font-mono text-[13px] leading-relaxed space-y-1">
        {additions.map((line) => (
          <p key={`add-${line}`} style={{ color: "hsl(var(--theme-status-success, 152 69% 43%))" }}>
            + {line}
          </p>
        ))}
        {removals.map((line) => (
          <p
            key={`rem-${line}`}
            className="line-through opacity-60"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            − {line}
          </p>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="text-[12px] font-medium px-2.5 py-1 rounded-md border"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.5)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
          onClick={() => {
            if (nextAddition && onAccept) onAccept(nextAddition)
            setDismissed(true)
          }}
        >
          Accept
        </button>
        <button
          type="button"
          className="text-[12px] font-medium px-2.5 py-1 rounded-md"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          onClick={() => setDismissed(true)}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

function SectionSaveBar({
  saveStatus,
  saveMessage,
  onSave,
}: {
  saveStatus: SectionSaveStatus
  saveMessage: string | null
  onSave: () => void
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <div className="min-w-0" aria-live="polite">
        {saveStatus === "saving" && (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Saving…
          </p>
        )}
        {saveStatus === "saved" && saveMessage && (
          <p
            className="text-[12px] font-medium"
            style={{ color: "hsl(var(--theme-status-success, 152 69% 43%))" }}
          >
            {saveMessage}
          </p>
        )}
        {saveStatus === "error" && saveMessage && (
          <p
            className="text-[12px] font-medium"
            style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
          >
            {saveMessage}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={saveStatus === "saving"}
        className="shrink-0 rounded-md px-3 py-1.5 text-[12px] font-semibold disabled:opacity-45"
        style={{
          background: "hsl(var(--theme-accent-primary, var(--theme-ink-primary)))",
          color: "hsl(var(--theme-surface-base, 0 0% 100%))",
        }}
      >
        {saveStatus === "saving" ? "Saving…" : "Save"}
      </button>
    </div>
  )
}

function ActiveCapabilitiesBlock({ chips }: { chips: string[] }) {
  return (
    <div
      className="mb-4 rounded-md border px-3 py-2.5"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.35)",
        background: "hsl(var(--theme-surface-elevated) / 0.1)",
      }}
    >
      <p
        className="text-[10px] font-mono uppercase tracking-wider mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        These values come from your agent settings.
      </p>
      <FieldLabel
        label="Active capabilities — from agent record"
        subtitle="Add or remove these in Configure, not here."
      />
      {chips.length === 0 ? (
        <p className="mt-2 text-[12px] italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No capabilities declared. Add them in Configure.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {chips.map((chip) => (
            <span
              key={chip}
              className="rounded px-2 py-0.5 text-[10px] font-mono"
              style={{
                border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
                color: "hsl(var(--theme-ink-tertiary))",
                background: "hsl(var(--theme-surface-elevated) / 0.35)",
              }}
            >
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PlatformDataBlock({ data }: { data: TrainingPlatformData }) {
  const chips = [
    { label: "Domain", value: data.domain },
    { label: "Model", value: data.model },
    { label: "Status", value: data.status },
    { label: "Visibility", value: data.visibility },
    { label: "Memory", value: data.memory },
  ]

  return (
    <div
      className="mt-4 rounded-md border px-3 py-2.5"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.35)",
        background: "hsl(var(--theme-surface-elevated) / 0.1)",
      }}
    >
      <p className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        These values come from your agent settings.
      </p>
      <FieldLabel
        label="Platform Data — from agent record"
        subtitle="Edit these in Configure, not here."
      />
      <div className="flex flex-wrap gap-1.5 mt-2">
        {chips.map((chip) => (
          <span
            key={chip.label}
            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-mono"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.4)",
              color: "hsl(var(--theme-ink-tertiary))",
              background: "hsl(var(--theme-surface-panel) / 0.35)",
            }}
          >
            <span className="opacity-70">{chip.label}</span>
            <span style={{ color: "hsl(var(--theme-ink-secondary))" }}>{chip.value || "—"}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function CurrentlySectionEditor(props: SectionEditorBaseProps) {
  const { label, content, defaultOpen } = props
  const [draft, setDraft] = React.useState(content)
  const { saveStatus, saveMessage, saveSection } = useSectionSave(props)

  React.useEffect(() => {
    setDraft(content)
  }, [content, props.objectId])

  return (
    <SectionShell label={label} defaultOpen={defaultOpen}>
      <FieldLabel
        label="Currently"
        subtitle="What's live, what's next. Update this at the start of each working session."
      />
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={6}
        className={monoInputClass}
        style={{ ...inputStyle, minHeight: "9rem" }}
      />
      <ProposalScaffold />
      <SectionSaveBar
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        onSave={() => void saveSection(draft)}
      />
    </SectionShell>
  )
}

export function IdentitySectionEditor(
  props: SectionEditorBaseProps & { platformData: TrainingPlatformData },
) {
  const { label, content, defaultOpen, platformData } = props
  const parsed = React.useMemo(() => parseIdentitySection(content), [content])
  const [voice, setVoice] = React.useState(parsed.voice)
  const [character, setCharacter] = React.useState(parsed.character)
  const { saveStatus, saveMessage, saveSection } = useSectionSave(props)

  React.useEffect(() => {
    const next = parseIdentitySection(content)
    setVoice(next.voice)
    setCharacter(next.character)
  }, [content, props.objectId])

  const handleSave = () => {
    void saveSection(serializeIdentitySection({ voice, character }))
  }

  return (
    <SectionShell label={label} defaultOpen={defaultOpen}>
      <FieldLabel
        label="Voice"
        subtitle="How Kip speaks. First person. One or two sentences."
      />
      <textarea
        value={voice}
        onChange={(e) => setVoice(e.target.value)}
        rows={2}
        className={`${monoInputClass} mb-4`}
        style={inputStyle}
      />
      <FieldLabel
        label="Character"
        subtitle="Who Kip is. Sincere, playful, sharp — expand on this."
      />
      <textarea
        value={character}
        onChange={(e) => setCharacter(e.target.value)}
        rows={3}
        className={monoInputClass}
        style={inputStyle}
      />
      <PlatformDataBlock data={platformData} />
      <ProposalScaffold />
      <SectionSaveBar saveStatus={saveStatus} saveMessage={saveMessage} onSave={handleSave} />
    </SectionShell>
  )
}

function RuleListEditor({
  rules,
  onRulesChange,
  addLabel,
  showProposal,
  onAcceptProposal,
}: {
  rules: string[]
  onRulesChange: (next: string[]) => void
  addLabel: string
  showProposal?: boolean
  onAcceptProposal?: (text: string) => void
}) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [editDraft, setEditDraft] = React.useState("")

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditDraft(rules[index] ?? "")
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const next = [...rules]
    next[editingIndex] = editDraft.trim()
    onRulesChange(next.filter(Boolean))
    setEditingIndex(null)
    setEditDraft("")
  }

  const cancelEdit = () => {
    setEditingIndex(null)
    setEditDraft("")
  }

  const deleteRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index))
    if (editingIndex === index) cancelEdit()
  }

  return (
    <div className="space-y-2">
      {rules.length === 0 && (
        <p className="text-[12px] italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No items yet. Add one below.
        </p>
      )}
      {rules.map((rule, index) => (
        <div
          key={`rule-${index}-${rule.slice(0, 12)}`}
          className="group rounded-md border px-3 py-2"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.4)",
            background: "hsl(var(--theme-surface-elevated) / 0.12)",
          }}
        >
          {editingIndex === index ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editDraft}
                onChange={(e) => setEditDraft(e.target.value)}
                className="w-full rounded-md border px-2.5 py-1.5 font-mono text-[13px] bg-transparent outline-none"
                style={inputStyle}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit()
                  if (e.key === "Escape") cancelEdit()
                }}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[11px] font-medium px-2 py-0.5 rounded border"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.5)", color: "hsl(var(--theme-ink-secondary))" }}
                  onClick={commitEdit}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-[11px] font-medium px-2 py-0.5 rounded"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p
                className="flex-1 font-mono text-[13px] leading-relaxed break-words"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {rule}
              </p>
              <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  aria-label="Edit rule"
                  className="p-1 rounded"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  onClick={() => startEdit(index)}
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete rule"
                  className="p-1 rounded"
                  style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                  onClick={() => deleteRule(index)}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        className="text-[12px] font-medium px-2.5 py-1 rounded-md border"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.5)",
          color: "hsl(var(--theme-ink-secondary))",
        }}
        onClick={() => onRulesChange([...rules, ""])}
      >
        {addLabel}
      </button>
      {showProposal && (
        <ProposalScaffold onAccept={onAcceptProposal} />
      )}
    </div>
  )
}

export function BehaviorSectionEditor(props: SectionEditorBaseProps) {
  const { label, content, defaultOpen } = props
  const [rules, setRules] = React.useState(() => parseRuleLines(content))
  const { saveStatus, saveMessage, saveSection } = useSectionSave(props)

  React.useEffect(() => {
    setRules(parseRuleLines(content))
  }, [content, props.objectId])

  const handleSave = () => {
    void saveSection(serializeRuleLines(rules))
  }

  const handleAcceptProposal = (text: string) => {
    setRules((prev) => [...prev.filter(Boolean), text])
  }

  return (
    <SectionShell label={label} defaultOpen={defaultOpen}>
      <RuleListEditor
        rules={rules}
        onRulesChange={setRules}
        addLabel="Add rule"
        showProposal
        onAcceptProposal={handleAcceptProposal}
      />
      <SectionSaveBar saveStatus={saveStatus} saveMessage={saveMessage} onSave={handleSave} />
    </SectionShell>
  )
}

function CapabilityListEditor({
  capabilities,
  onCapabilitiesChange,
  onAcceptProposal,
}: {
  capabilities: CapabilityItem[]
  onCapabilitiesChange: (next: CapabilityItem[]) => void
  onAcceptProposal?: (text: string) => void
}) {
  const [editingIndex, setEditingIndex] = React.useState<number | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editDescription, setEditDescription] = React.useState("")

  const startEdit = (index: number) => {
    setEditingIndex(index)
    setEditName(capabilities[index]?.name ?? "")
    setEditDescription(capabilities[index]?.description ?? "")
  }

  const commitEdit = () => {
    if (editingIndex === null) return
    const next = [...capabilities]
    next[editingIndex] = { name: editName.trim(), description: editDescription.trim() }
    onCapabilitiesChange(next.filter((c) => c.name.trim()))
    setEditingIndex(null)
  }

  const cancelEdit = () => setEditingIndex(null)

  const deleteItem = (index: number) => {
    onCapabilitiesChange(capabilities.filter((_, i) => i !== index))
    if (editingIndex === index) cancelEdit()
  }

  return (
    <div className="space-y-2">
      {capabilities.length === 0 && (
        <p className="text-[12px] italic" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No capabilities yet. Add one below.
        </p>
      )}
      {capabilities.map((cap, index) => (
        <div
          key={`cap-${index}-${cap.name.slice(0, 12)}`}
          className="group rounded-md border px-3 py-2"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.4)",
            background: "hsl(var(--theme-surface-elevated) / 0.12)",
          }}
        >
          {editingIndex === index ? (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Capability name"
                className="w-full rounded-md border px-2.5 py-1.5 font-mono text-[13px] bg-transparent outline-none"
                style={inputStyle}
                autoFocus
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description"
                className="w-full rounded-md border px-2.5 py-1.5 font-mono text-[13px] bg-transparent outline-none"
                style={inputStyle}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-[11px] font-medium px-2 py-0.5 rounded border"
                  style={{ borderColor: "hsl(var(--theme-border-soft) / 0.5)", color: "hsl(var(--theme-ink-secondary))" }}
                  onClick={commitEdit}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="text-[11px] font-medium px-2 py-0.5 rounded"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  onClick={cancelEdit}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <p className="flex-1 font-mono text-[13px] leading-relaxed break-words" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                <span className="font-semibold" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                  {cap.name}
                </span>
                {cap.description ? (
                  <span style={{ color: "hsl(var(--theme-ink-tertiary))" }}> — {cap.description}</span>
                ) : null}
              </p>
              <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  aria-label="Edit capability"
                  className="p-1 rounded"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  onClick={() => startEdit(index)}
                >
                  <PencilIcon className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Delete capability"
                  className="p-1 rounded"
                  style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
                  onClick={() => deleteItem(index)}
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        className="text-[12px] font-medium px-2.5 py-1 rounded-md border"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.5)",
          color: "hsl(var(--theme-ink-secondary))",
        }}
        onClick={() => onCapabilitiesChange([...capabilities, { name: "", description: "" }])}
      >
        Add capability
      </button>
      <ProposalScaffold
        additions={["**New capability** — Example description from Kip (scaffold)"]}
        onAccept={(text) => {
          const parsed = parseCapabilityLines(text)[0]
          if (parsed) onCapabilitiesChange([...capabilities.filter((c) => c.name.trim()), parsed])
        }}
      />
    </div>
  )
}

export function CapabilitiesSectionEditor(
  props: SectionEditorBaseProps & { activeCapabilities: string[] },
) {
  const { label, content, defaultOpen, activeCapabilities } = props
  const [capabilities, setCapabilities] = React.useState(() => parseCapabilityLines(content))
  const { saveStatus, saveMessage, saveSection } = useSectionSave(props)

  React.useEffect(() => {
    setCapabilities(parseCapabilityLines(content))
  }, [content, props.objectId])

  const handleSave = () => {
    void saveSection(serializeCapabilityLines(capabilities))
  }

  return (
    <SectionShell label={label} defaultOpen={defaultOpen}>
      <ActiveCapabilitiesBlock chips={activeCapabilities} />
      <CapabilityListEditor
        capabilities={capabilities}
        onCapabilitiesChange={setCapabilities}
      />
      <SectionSaveBar saveStatus={saveStatus} saveMessage={saveMessage} onSave={handleSave} />
    </SectionShell>
  )
}

export function GovernanceSectionEditor(props: SectionEditorBaseProps) {
  const { label, content, defaultOpen } = props
  const [draft, setDraft] = React.useState(content)
  const { saveStatus, saveMessage, saveSection } = useSectionSave(props)

  React.useEffect(() => {
    setDraft(content)
  }, [content, props.objectId])

  return (
    <SectionShell label={label} defaultOpen={defaultOpen}>
      <FieldLabel
        label="Governance"
        subtitle="Platform knowledge. EntityKinds, hierarchy, locked decisions. Edit rarely."
      />
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={8}
        className={monoInputClass}
        style={{ ...inputStyle, minHeight: "12rem" }}
      />
      <ProposalScaffold />
      <SectionSaveBar
        saveStatus={saveStatus}
        saveMessage={saveMessage}
        onSave={() => void saveSection(draft)}
      />
    </SectionShell>
  )
}
