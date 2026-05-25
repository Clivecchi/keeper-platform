"use client"

/**
 * BoardDefConfigPresence
 * ======================
 * KeeperPresence config layout for board definition objects.
 * Human-readable structure first — raw JSON quiet and optional.
 */

import * as React from "react"
import type { UniversalBoardDef } from "../boards/UniversalBoardDefinition"

export interface BoardDefConfigPresenceProps {
  def: UniversalBoardDef
  onLabelResolved?: (label: string) => void
}

function PresenceSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="mb-5">
      <p
        className="text-[9px] font-semibold uppercase tracking-widest mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary) / 0.5)" }}
      >
        {title}
      </p>
      {children}
    </div>
  )
}

function StructureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5">
      <span
        className="text-[12px] shrink-0"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        {label}
      </span>
      <span
        className="text-[12px] text-right leading-snug"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {value}
      </span>
    </div>
  )
}

function formatNavSections(def: UniversalBoardDef): string {
  const s = def.nav.sections
  const parts: string[] = []
  if (s.dialogs) parts.push("Dialogs")
  if (s.journeys) parts.push("Journeys")
  if (s.keepers) parts.push("Keepers")
  if (s.drafts) parts.push("Drafts")
  if (s.agents) parts.push("Agents")
  if (s.boardDefs) parts.push("Board Definitions")
  const integrations = def.nav.integrations?.map((i) => i.label) ?? []
  if (integrations.length > 0) parts.push(`Integrations (${integrations.join(", ")})`)
  return parts.length > 0 ? parts.join(" · ") : "None"
}

export function BoardDefConfigPresence({
  def,
  onLabelResolved,
}: BoardDefConfigPresenceProps) {
  const [showJson, setShowJson] = React.useState(false)
  const hairline = "hsl(var(--theme-border-soft) / 0.15)"

  React.useEffect(() => {
    if (def.displayName && onLabelResolved) onLabelResolved(def.displayName)
  }, [def.displayName, onLabelResolved])

  const accessParts = [
    def.access.isPrivate ? "private" : "shared",
    def.access.isAdminOnly ? "admin only" : null,
  ].filter(Boolean)

  const specJson = JSON.stringify(def, null, 2)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-4 pt-4 pb-3" style={{ borderBottom: `1px solid ${hairline}` }}>
        <p
          className="text-[9px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: "hsl(var(--theme-ink-tertiary) / 0.45)" }}
        >
          Configuring
        </p>
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary) / 0.65)" }}
        >
          Board Definition
        </p>
        <h2
          className="text-[15px] font-semibold leading-snug mt-1"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {def.displayName}
        </h2>
        <p
          className="text-[10px] mt-2 font-mono"
          style={{ color: "hsl(var(--theme-ink-tertiary) / 0.7)" }}
        >
          {def.boardId}
          {accessParts.length > 0 ? ` · ${accessParts.join(" · ")}` : ""}
        </p>
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4">
        <PresenceSection title="Navigation">
          <StructureRow label="Sections" value={formatNavSections(def)} />
        </PresenceSection>

        <PresenceSection title="Conversation">
          <StructureRow label="Agent" value={def.conversation.agentName} />
          <StructureRow label="Kip mode" value={def.conversation.kipMode} />
          <StructureRow label="Dialogue" value={def.conversation.dialogueMode} />
          {def.conversation.showServiceBar && (
            <StructureRow label="Service bar" value="visible" />
          )}
        </PresenceSection>

        <PresenceSection title="Chronicle subjects">
          <div className="space-y-2">
            {def.contextSurface.viewStates.map((vs) => (
              <div
                key={vs.key}
                className="rounded-md px-2.5 py-2"
                style={{ background: "hsl(var(--theme-surface-elevated) / 0.3)" }}
              >
                <p
                  className="text-[11px] font-medium capitalize"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {vs.key}
                </p>
                <p
                  className="text-[10px] leading-relaxed mt-0.5 line-clamp-2"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {vs.presenceTreatment}
                </p>
              </div>
            ))}
          </div>
        </PresenceSection>

        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowJson((v) => !v)}
            className="text-[10px] transition-opacity hover:opacity-80"
            style={{ color: "hsl(var(--theme-ink-tertiary) / 0.65)" }}
          >
            {showJson ? "Hide" : "Show"} full spec JSON
          </button>
          {showJson && (
            <pre
              className="mt-2 p-3 rounded-md text-[10px] leading-relaxed overflow-auto max-h-48"
              style={{
                fontFamily: "ui-monospace, monospace",
                color: "hsl(var(--theme-ink-tertiary))",
                background: "hsl(var(--theme-surface-elevated) / 0.2)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {specJson}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
