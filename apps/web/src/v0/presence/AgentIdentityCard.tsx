"use client"

import * as React from "react"

export interface AgentIdentityCardProps {
  name: string
  tagline?: string
  description?: string
  personality?: string
  avatar?: string
  themeColor?: string
  model?: string
  modelProvider?: string
  status?: string
  agentClass?: string
  editable?: boolean
  onNameChange?: (v: string) => void
  onTaglineChange?: (v: string) => void
}

function resolveAccent(themeColor?: string): string {
  if (!themeColor?.trim()) return "hsl(var(--theme-accent-primary, var(--theme-ink-primary)))"
  const t = themeColor.trim()
  if (t.startsWith("hsl") || t.startsWith("#") || t.startsWith("rgb")) return t
  return `hsl(var(--theme-${t}, var(--theme-accent-primary)))`
}

export function AgentIdentityCard({
  name,
  tagline,
  description,
  personality,
  avatar,
  themeColor,
  model,
  modelProvider,
  status,
  agentClass,
  editable,
  onNameChange,
  onTaglineChange,
}: AgentIdentityCardProps) {
  const accent = resolveAccent(themeColor)
  const displayAvatar = avatar?.trim() || "◇"
  const metaParts = [
    status?.trim(),
    modelProvider?.trim(),
    model?.trim(),
    agentClass?.trim(),
  ].filter(Boolean)

  return (
    <div
      className="relative overflow-hidden rounded-xl border mb-5"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        background:
          "linear-gradient(145deg, hsl(var(--theme-surface-elevated) / 0.55) 0%, hsl(var(--theme-surface-base) / 0.9) 55%, hsl(var(--theme-surface-elevated) / 0.35) 100%)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="flex gap-4 p-4 pt-5">
        <div
          className="shrink-0 flex items-center justify-center w-16 h-16 rounded-lg text-2xl font-semibold border"
          style={{
            borderColor: `${accent}55`,
            background: `${accent}18`,
            color: accent,
          }}
          aria-hidden={!avatar}
        >
          {displayAvatar.length <= 2 ? displayAvatar : (
            <span className="text-[11px] font-mono truncate px-1">{displayAvatar.slice(0, 8)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Agent
          </p>
          {editable && onNameChange ? (
            <input
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Agent name"
              className="w-full text-[20px] font-bold leading-tight bg-transparent outline-none"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            />
          ) : (
            <h2
              className="text-[20px] font-bold leading-tight truncate"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {name || "Untitled agent"}
            </h2>
          )}
          {editable && onTaglineChange ? (
            <input
              value={tagline ?? ""}
              onChange={(e) => onTaglineChange(e.target.value)}
              placeholder="Tagline"
              className="w-full mt-1 text-[13px] bg-transparent outline-none"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            />
          ) : tagline?.trim() ? (
            <p
              className="mt-1 text-[13px] italic"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {tagline}
            </p>
          ) : null}
          {metaParts.length > 0 && (
            <p
              className="mt-2 text-[11px] font-medium tabular-nums"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {metaParts.join(" · ")}
            </p>
          )}
        </div>
      </div>
      {(description?.trim() || personality?.trim()) && (
        <div
          className="px-4 pb-4 pt-0 space-y-2 border-t"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.35)" }}
        >
          {description?.trim() && (
            <p
              className="text-[13px] leading-relaxed pt-3"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {description}
            </p>
          )}
          {personality?.trim() && (
            <p
              className="text-[12px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              <span className="font-semibold uppercase tracking-wide text-[10px] mr-2">
                Voice
              </span>
              {personality}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
