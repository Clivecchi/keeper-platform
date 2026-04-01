"use client"

import * as React from "react"
import type { AudienceRole, DomainFrameJson } from "../data/domain-frame.types"
import { mergeCoverChatInterface } from "../frames/cover/CoverChatInterface"
import { useV0Shell } from "../shell/V0ShellContext"
import { apiFetch } from "../../lib/api"

const ALL_ROLES: AudienceRole[] = ["guest", "keeper", "admin"]

const SECTIONS = ["identity", "theme", "audience", "kip", "cover"] as const
type SectionId = (typeof SECTIONS)[number]

function cloneFrame(frame: DomainFrameJson): DomainFrameJson {
  return structuredClone(frame) as DomainFrameJson
}

function sortRolesCopy(roles: AudienceRole[]): AudienceRole[] {
  return [...roles].sort()
}

function rolesEqual(a: AudienceRole[], b: AudienceRole[]): boolean {
  const x = sortRolesCopy(a).join(",")
  const y = sortRolesCopy(b).join(",")
  return x === y
}

function sectionDirty(section: SectionId, draft: DomainFrameJson, baseline: DomainFrameJson): boolean {
  const dChat = mergeCoverChatInterface(draft.cover.chat_interface)
  const bChat = mergeCoverChatInterface(baseline.cover.chat_interface)
  switch (section) {
    case "identity":
      return (
        draft.theme.wordmark !== baseline.theme.wordmark
        || draft.theme.tagline !== baseline.theme.tagline
      )
    case "theme":
      return (
        draft.theme.colors.primary !== baseline.theme.colors.primary
        || draft.theme.colors.accent !== baseline.theme.colors.accent
        || draft.theme.colors.surface !== baseline.theme.colors.surface
        || draft.theme.fonts.display !== baseline.theme.fonts.display
        || draft.theme.fonts.ui !== baseline.theme.fonts.ui
      )
    case "audience":
      return (
        !rolesEqual(draft.audience_roles, baseline.audience_roles)
        || draft.kip_context.guest !== baseline.kip_context.guest
        || draft.kip_context.keeper !== baseline.kip_context.keeper
        || draft.kip_context.admin !== baseline.kip_context.admin
      )
    case "kip":
      return draft.kip.visibility !== baseline.kip.visibility || draft.kip.greeting !== baseline.kip.greeting
    case "cover":
      return (
        dChat.enabled !== bChat.enabled
        || (dChat.label ?? "") !== (bChat.label ?? "")
        || (dChat.placeholder ?? "") !== (bChat.placeholder ?? "")
        || !rolesEqual(dChat.available_to, bChat.available_to)
      )
    default:
      return false
  }
}

function sectionSummary(section: SectionId, frame: DomainFrameJson): string {
  const chat = mergeCoverChatInterface(frame.cover.chat_interface)
  switch (section) {
    case "identity":
      return [frame.theme.wordmark, frame.theme.tagline].filter(Boolean).join(" · ") || "—"
    case "theme":
      return [
        frame.theme.colors.primary,
        frame.theme.fonts.display,
        frame.theme.fonts.ui,
      ].join(" · ")
    case "audience":
      return `${sortRolesCopy(frame.audience_roles).join("/")} · contexts…`
    case "kip":
      return `${frame.kip.model} · ${frame.kip.visibility} · ${frame.kip.greeting.slice(0, 40)}${frame.kip.greeting.length > 40 ? "…" : ""}`
    case "cover":
      return `${chat.enabled ? "on" : "off"} · ${(chat.label || "label").slice(0, 24)}`
    default:
      return ""
  }
}

function sectionMarkerColor(section: SectionId, frame: DomainFrameJson): string {
  switch (section) {
    case "identity":
      return frame.theme.colors.primary
    case "theme":
      return frame.theme.colors.accent
    case "audience":
    case "kip":
    case "cover":
      return "hsl(var(--theme-focus-ring))"
    default:
      return "hsl(var(--theme-focus-ring))"
  }
}

export interface DomainBriefProps {
  domainFrame: DomainFrameJson
}

export function DomainBrief({ domainFrame }: DomainBriefProps) {
  const { domainSlug, reloadDomainFrame } = useV0Shell()
  const [draft, setDraft] = React.useState(() => cloneFrame(domainFrame))
  const [baseline, setBaseline] = React.useState(() => cloneFrame(domainFrame))
  const [open, setOpen] = React.useState<Record<SectionId, boolean>>(() => ({
    identity: true,
    theme: false,
    audience: false,
    kip: false,
    cover: false,
  }))
  const [publishState, setPublishState] = React.useState<"idle" | "saving" | "success" | "error">("idle")
  const [publishError, setPublishError] = React.useState<string | null>(null)
  const domainKeyRef = React.useRef(domainFrame.domain)

  React.useEffect(() => {
    const c = cloneFrame(domainFrame)
    setDraft(c)
    setBaseline(c)
    setOpen({
      identity: true,
      theme: false,
      audience: false,
      kip: false,
      cover: false,
    })
  }, [domainFrame])

  React.useEffect(() => {
    if (domainKeyRef.current !== domainFrame.domain) {
      domainKeyRef.current = domainFrame.domain
      setPublishState("idle")
      setPublishError(null)
    }
  }, [domainFrame.domain])

  const dirty = React.useMemo(() => {
    const rec = {} as Record<SectionId, boolean>
    for (const s of SECTIONS) rec[s] = sectionDirty(s, draft, baseline)
    return rec
  }, [draft, baseline])

  const anyDirty = React.useMemo(() => SECTIONS.some((s) => dirty[s]), [dirty])

  React.useEffect(() => {
    if (publishState === "success" && anyDirty) setPublishState("idle")
  }, [anyDirty, publishState])

  const toggleSection = (id: SectionId) => {
    setOpen((o) => ({ ...o, [id]: !o[id] }))
  }

  const ink = "hsl(var(--theme-ink-primary))"
  const inkSecondary = "hsl(var(--theme-ink-secondary))"
  const inkTertiary = "hsl(var(--theme-ink-tertiary))"
  const border = "1px solid hsl(var(--theme-border-soft))"
  const inputBg = "hsl(var(--theme-surface-paper) / 0.95)"
  const panelBg = "hsl(var(--theme-surface-panel) / 0.6)"
  const headerBg = "hsl(var(--theme-hover-surface) / 0.5)"

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: inkTertiary,
    marginBottom: 4,
  }

  const textInputStyle = (muted?: boolean): React.CSSProperties => ({
    width: "100%",
    boxSizing: "border-box",
    border,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    background: inputBg,
    color: muted ? inkTertiary : ink,
    opacity: muted ? 0.75 : 1,
  })

  const updateChat = (patch: Partial<ReturnType<typeof mergeCoverChatInterface>>) => {
    setDraft((d) => {
      const prev = mergeCoverChatInterface(d.cover.chat_interface)
      return {
        ...d,
        cover: {
          ...d.cover,
          chat_interface: { ...prev, ...patch },
        },
      }
    })
  }

  const toggleAudienceRole = (role: AudienceRole) => {
    setDraft((d) => {
      const has = d.audience_roles.includes(role)
      const audience_roles = has
        ? d.audience_roles.filter((r) => r !== role)
        : [...d.audience_roles, role]
      return { ...d, audience_roles }
    })
  }

  const toggleChatRole = (role: AudienceRole) => {
    const chat = mergeCoverChatInterface(draft.cover.chat_interface)
    const has = chat.available_to.includes(role)
    const available_to = has
      ? chat.available_to.filter((r) => r !== role)
      : [...chat.available_to, role]
    updateChat({ available_to })
  }

  const handleDiscard = () => {
    setDraft(cloneFrame(baseline))
    setPublishState("idle")
    setPublishError(null)
  }

  const handlePublish = async () => {
    if (!domainSlug) return
    setPublishState("saving")
    setPublishError(null)
    try {
      await apiFetch(`/api/domains/${encodeURIComponent(domainSlug)}/frame`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })
      await reloadDomainFrame()
      setPublishState("success")
    } catch (e) {
      setPublishState("error")
      setPublishError(e instanceof Error ? e.message : "Publish failed")
    }
  }

  const chat = mergeCoverChatInterface(draft.cover.chat_interface)
  const changeDotColor = draft.theme.colors.accent

  const pillBase: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    padding: "4px 10px",
    borderRadius: 999,
    border: `1px solid hsl(var(--theme-border-strong))`,
    cursor: "pointer",
    background: "transparent",
    color: ink,
  }

  return (
    <div className="px-4 py-4 space-y-3">
      <header className="pb-1">
        <h2 className="text-lg font-semibold" style={{ color: ink }}>
          Domain Brief
        </h2>
        <p className="mt-1 text-[13px] leading-snug" style={{ color: inkSecondary }}>
          Edit how this domain reads — publish to save to the database.
        </p>
      </header>

      {SECTIONS.map((sid) => {
        const isOpen = open[sid]
        const isDirty = dirty[sid]
        const marker = sectionMarkerColor(sid, draft)
        return (
          <div
            key={sid}
            style={{
              border,
              borderRadius: 8,
              overflow: "hidden",
              background: panelBg,
            }}
          >
            <button
              type="button"
              onClick={() => toggleSection(sid)}
              className="w-full text-left flex items-center gap-2 px-3 py-2.5"
              style={{
                background: headerBg,
                border: "none",
                cursor: "pointer",
                color: ink,
              }}
            >
              <span
                className="shrink-0 rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  background: marker,
                }}
              />
              <span className="font-semibold text-[13px] capitalize flex-1">{sid}</span>
              {isDirty && (
                <span
                  className="shrink-0 rounded-full"
                  title="Unsaved changes"
                  style={{
                    width: 8,
                    height: 8,
                    background: changeDotColor,
                  }}
                />
              )}
              <span className="text-[11px] opacity-70">{isOpen ? "▾" : "▸"}</span>
            </button>
            {!isOpen && (
              <div className="px-3 py-2 text-[12px] border-t" style={{ borderColor: "hsl(var(--theme-line-hairline))", color: inkSecondary }}>
                {sectionSummary(sid, draft)}
              </div>
            )}
            {isOpen && (
              <div className="px-3 py-3 space-y-3 border-t" style={{ borderColor: "hsl(var(--theme-line-hairline))" }}>
                {sid === "identity" && (
                  <>
                    <div>
                      <div style={fieldLabelStyle}>Wordmark</div>
                      <input
                        type="text"
                        style={textInputStyle()}
                        value={draft.theme.wordmark}
                        onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, wordmark: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Tagline</div>
                      <input
                        type="text"
                        style={textInputStyle()}
                        value={draft.theme.tagline}
                        onChange={(e) => setDraft((d) => ({ ...d, theme: { ...d.theme, tagline: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Domain (read-only)</div>
                      <input type="text" style={textInputStyle(true)} value={draft.domain} disabled readOnly />
                    </div>
                  </>
                )}
                {sid === "theme" && (
                  <>
                    {(["primary", "accent", "surface"] as const).map((key) => (
                      <div key={key}>
                        <div style={fieldLabelStyle}>Color · {key}</div>
                        <div className="flex items-center gap-2">
                          <div
                            className="shrink-0 rounded-md border"
                            style={{
                              width: 36,
                              height: 28,
                              background: draft.theme.colors[key],
                              borderColor: "hsl(var(--theme-border-strong))",
                            }}
                          />
                          <input
                            type="text"
                            style={{ ...textInputStyle(), flex: 1 }}
                            value={draft.theme.colors[key]}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                theme: {
                                  ...d.theme,
                                  colors: { ...d.theme.colors, [key]: e.target.value },
                                },
                              }))}
                          />
                        </div>
                      </div>
                    ))}
                    <div>
                      <div style={fieldLabelStyle}>Font · display</div>
                      <input
                        type="text"
                        style={textInputStyle()}
                        value={draft.theme.fonts.display}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            theme: { ...d.theme, fonts: { ...d.theme.fonts, display: e.target.value } },
                          }))}
                      />
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Font · UI</div>
                      <input
                        type="text"
                        style={textInputStyle()}
                        value={draft.theme.fonts.ui}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            theme: { ...d.theme, fonts: { ...d.theme.fonts, ui: e.target.value } },
                          }))}
                      />
                    </div>
                  </>
                )}
                {sid === "audience" && (
                  <>
                    <div>
                      <div style={fieldLabelStyle}>Audience roles</div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map((role) => {
                          const active = draft.audience_roles.includes(role)
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => toggleAudienceRole(role)}
                              style={{
                                ...pillBase,
                                background: active ? draft.theme.colors.primary : "transparent",
                                color: active ? "hsl(var(--theme-surface-paper))" : ink,
                                borderColor: active ? draft.theme.colors.primary : "hsl(var(--theme-border-strong))",
                              }}
                            >
                              {role}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {(["guest", "keeper", "admin"] as const).map((rk) => (
                      <div key={rk}>
                        <div style={fieldLabelStyle}>Kip context · {rk}</div>
                        <textarea
                          style={{ ...textInputStyle(), minHeight: 72, resize: "vertical" as const }}
                          value={draft.kip_context[rk]}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              kip_context: { ...d.kip_context, [rk]: e.target.value },
                            }))}
                        />
                      </div>
                    ))}
                  </>
                )}
                {sid === "kip" && (
                  <>
                    <div>
                      <div style={fieldLabelStyle}>Model (read-only)</div>
                      <input type="text" style={textInputStyle(true)} value={draft.kip.model} disabled readOnly />
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Visibility</div>
                      <div className="flex gap-2">
                        {(["public", "private"] as const).map((v) => {
                          const active = draft.kip.visibility === v
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setDraft((d) => ({ ...d, kip: { ...d.kip, visibility: v } }))}
                              style={{
                                ...pillBase,
                                textTransform: "capitalize",
                                background: active ? draft.theme.colors.primary : "transparent",
                                color: active ? "hsl(var(--theme-surface-paper))" : ink,
                                borderColor: active ? draft.theme.colors.primary : "hsl(var(--theme-border-strong))",
                              }}
                            >
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Greeting</div>
                      <textarea
                        style={{ ...textInputStyle(), minHeight: 72, resize: "vertical" as const }}
                        value={draft.kip.greeting}
                        onChange={(e) => setDraft((d) => ({ ...d, kip: { ...d.kip, greeting: e.target.value } }))}
                      />
                    </div>
                  </>
                )}
                {sid === "cover" && (
                  <>
                    <div>
                      <div style={fieldLabelStyle}>Chat interface · enabled</div>
                      <div className="flex gap-2">
                        {([true, false] as const).map((on) => {
                          const active = chat.enabled === on
                          return (
                            <button
                              key={String(on)}
                              type="button"
                              onClick={() => updateChat({ enabled: on })}
                              style={{
                                ...pillBase,
                                background: active ? draft.theme.colors.primary : "transparent",
                                color: active ? "hsl(var(--theme-surface-paper))" : ink,
                                borderColor: active ? draft.theme.colors.primary : "hsl(var(--theme-border-strong))",
                              }}
                            >
                              {on ? "on" : "off"}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Chat label</div>
                      <input
                        type="text"
                        style={textInputStyle()}
                        value={chat.label ?? ""}
                        onChange={(e) => updateChat({ label: e.target.value })}
                      />
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Placeholder</div>
                      <input
                        type="text"
                        style={textInputStyle()}
                        value={chat.placeholder ?? ""}
                        onChange={(e) => updateChat({ placeholder: e.target.value })}
                      />
                    </div>
                    <div>
                      <div style={fieldLabelStyle}>Available to</div>
                      <div className="flex flex-wrap gap-2">
                        {ALL_ROLES.map((role) => {
                          const active = chat.available_to.includes(role)
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => toggleChatRole(role)}
                              style={{
                                ...pillBase,
                                background: active ? draft.theme.colors.primary : "transparent",
                                color: active ? "hsl(var(--theme-surface-paper))" : ink,
                                borderColor: active ? draft.theme.colors.primary : "hsl(var(--theme-border-strong))",
                              }}
                            >
                              {role}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          disabled={!anyDirty || publishState === "saving"}
          onClick={handleDiscard}
          style={{
            ...pillBase,
            opacity: anyDirty ? 1 : 0.45,
            cursor: anyDirty ? "pointer" : "not-allowed",
          }}
        >
          Discard
        </button>
        <button
          type="button"
          disabled={!anyDirty || publishState === "saving" || !domainSlug}
          onClick={handlePublish}
          style={{
            ...pillBase,
            fontWeight: 700,
            borderColor: "hsl(var(--theme-focus-ring))",
            background: anyDirty ? "hsl(var(--theme-press-surface))" : "transparent",
            opacity: anyDirty ? 1 : 0.45,
            cursor: anyDirty ? "pointer" : "not-allowed",
          }}
        >
          {publishState === "saving" ? "Publishing…" : "Publish"}
        </button>
        {publishState === "success" && (
          <span className="text-[12px]" style={{ color: inkSecondary }}>
            Saved.
          </span>
        )}
        {publishState === "error" && publishError && (
          <span className="text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {publishError}
          </span>
        )}
      </div>
    </div>
  )
}
