"use client"

/**
 * ThemeFrame
 *
 * Admin editing surface for a domain's DomainFrameTheme:
 * wordmark, tagline, primary/accent/surface colors, and display/ui fonts.
 *
 * Uses DesignFrame for consistent platform chrome:
 *   - Domain cover image as background (matches actual platform look)
 *   - Standard sticky header with title
 *   - Margin interaction bar at the bottom
 *
 * Route: /d/:slug?frame=theme (admin-only)
 * Also accessible from the Designer Board canvas.
 */

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { useV0Shell } from "../../shell/V0ShellContext"
import { useAuth } from "../../../context/AuthContext"
import { apiFetch } from "../../../lib/api"
import type { DomainFrameTheme } from "../../data/domain-frame.types"
import { resolveDomainThemeSync } from "../../themes/domainThemeResolver"

// =============================================================================
// Types
// =============================================================================

interface ThemeFrameProps {
  styleId?: StyleId
  themeSlug?: string | null
  domainSlug?: string
}

const DISPLAY_FONTS = [
  "Cormorant Garamond",
  "Playfair Display",
  "Libre Baskerville",
  "Merriweather",
  "Lora",
  "EB Garamond",
  "Gloock",
  "DM Serif Display",
]

const UI_FONTS = [
  "Outfit",
  "Inter",
  "DM Sans",
  "Plus Jakarta Sans",
  "Nunito",
  "Raleway",
  "Work Sans",
  "Manrope",
]

// =============================================================================
// Helpers
// =============================================================================

function hexToHSLString(hex: string): string {
  const clean = hex.replace("#", "").padStart(6, "0")
  const match = /^([0-9a-fA-F]{6})$/.exec(clean)
  if (!match) return hex
  const r = parseInt(match[1].slice(0, 2), 16) / 255
  const g = parseInt(match[1].slice(2, 4), 16) / 255
  const b = parseInt(match[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`
}

// =============================================================================
// Sub-components
// =============================================================================

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--theme-ink-tertiary)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--theme-border-soft)" }} />
    </div>
  )
}

function FieldRow({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-4 items-start py-3" style={{ borderBottom: "1px solid var(--theme-border-soft)" }}>
      <div>
        <div className="text-[13px] font-medium" style={{ color: "var(--theme-ink-primary)" }}>{label}</div>
        {hint && <div className="text-[11px] mt-0.5" style={{ color: "var(--theme-ink-tertiary)" }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none transition-shadow"
      style={{
        border: "1px solid var(--theme-border-soft)",
        color: "var(--theme-ink-primary)",
        background: "hsl(var(--theme-surface-paper) / 0.6)",
      }}
    />
  )
}

function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 rounded-lg overflow-hidden cursor-pointer"
        style={{ width: 40, height: 40, border: "1px solid var(--theme-border-soft)" }}
      >
        <div className="absolute inset-0" style={{ background: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={label}
        />
      </div>
      <TextInput value={value} onChange={onChange} placeholder="#000000" />
      <div className="text-[11px] shrink-0" style={{ color: "var(--theme-ink-tertiary)", minWidth: 120 }}>
        {hexToHSLString(value)}
      </div>
    </div>
  )
}

function FontSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg px-3 py-2 text-[13px] outline-none"
      style={{
        border: "1px solid var(--theme-border-soft)",
        color: "var(--theme-ink-primary)",
        background: "hsl(var(--theme-surface-paper) / 0.6)",
      }}
    >
      {options.map((f) => (
        <option key={f} value={f}>{f}</option>
      ))}
    </select>
  )
}

function TokenSwatch({ tokens }: { tokens: Record<string, string> }) {
  const keys = ["surface.page", "surface.paper", "ink.primary", "ink.secondary", "dialogue.userBg", "dialogue.agentBg"]
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((key) => {
        const raw = tokens[key]
        if (!raw) return null
        const color = raw.includes("hsl") ? raw : `hsl(${raw})`
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <div
              className="rounded-md"
              style={{ width: 32, height: 32, background: color, border: "1px solid rgba(0,0,0,0.08)" }}
              title={`${key}: ${raw}`}
            />
            <span className="text-[9px]" style={{ color: "var(--theme-ink-tertiary)" }}>
              {key.split(".")[1]}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// =============================================================================
// Main component
// =============================================================================

export function ThemeFrame({ styleId = "neutral", themeSlug, domainSlug: propSlug }: ThemeFrameProps) {
  const { domainSlug: ctxSlug, domainFrame, reloadDomainFrame, closeToBoard } = useV0Shell()
  const { isAdmin } = useAuth()
  const domainSlug = propSlug ?? ctxSlug ?? ""

  const defaultTheme: DomainFrameTheme = {
    wordmark: "",
    tagline: "",
    background: "",
    colors: { primary: "#2d6a7f", accent: "#b8963e", surface: "#fdfaf4" },
    fonts: { display: "Cormorant Garamond", ui: "Outfit" },
  }

  const [draft, setDraft] = React.useState<DomainFrameTheme>(domainFrame?.theme ?? defaultTheme)
  const [saving, setSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saved" | "error">("idle")

  React.useEffect(() => {
    if (domainFrame?.theme) setDraft(domainFrame.theme)
  }, [domainFrame?.theme])

  const previewTokens = React.useMemo(() => resolveDomainThemeSync(draft, "light"), [draft])

  const setColor = (key: keyof DomainFrameTheme["colors"], v: string) => {
    setDraft((p) => ({ ...p, colors: { ...p.colors, [key]: v } }))
    setSaveStatus("idle")
  }

  const setFont = (key: keyof DomainFrameTheme["fonts"], v: string) => {
    setDraft((p) => ({ ...p, fonts: { ...p.fonts, [key]: v } }))
    setSaveStatus("idle")
  }

  const setField = <K extends keyof DomainFrameTheme>(key: K, v: DomainFrameTheme[K]) => {
    setDraft((p) => ({ ...p, [key]: v }))
    setSaveStatus("idle")
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus("idle")
    try {
      await apiFetch(`/api/domains/${domainSlug}/frame`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: draft }),
      })
      await reloadDomainFrame()
      setSaveStatus("saved")
      setTimeout(() => setSaveStatus("idle"), 3000)
    } catch {
      setSaveStatus("error")
    } finally {
      setSaving(false)
    }
  }

  const saveButton = (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving || !isAdmin}
      className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 disabled:opacity-40"
      style={{ borderColor: "var(--theme-border-soft)", color: "var(--theme-ink-primary)" }}
    >
      {saving ? "Saving…" : saveStatus === "saved" ? "✓ Saved" : saveStatus === "error" ? "Error — retry" : "Save Theme"}
    </button>
  )

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Theme Editor"
      subtitle={domainSlug ? `${domainSlug} · brand tokens & identity` : "brand tokens & identity"}
      rightSlot={saveButton}
      onClose={closeToBoard}
    >
      {!isAdmin ? (
        <div className="rounded-2xl border px-6 py-6" style={{ borderColor: "var(--theme-border-soft)" }}>
          <p className="text-sm" style={{ color: "var(--theme-ink-primary)" }}>Admin access required to edit the theme.</p>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 1fr" }}>

          {/* Left — edit form */}
          <div
            className="rounded-2xl px-6 py-5"
            style={{
              background: "hsl(var(--theme-surface-paper) / 0.85)",
              border: "1px solid var(--theme-border-soft)",
              backdropFilter: "blur(8px)",
            }}
          >
            <SectionLabel label="Identity" />
            <FieldRow label="Wordmark" hint="Short name in headers">
              <TextInput value={draft.wordmark} onChange={(v) => setField("wordmark", v)} placeholder="KE3P" />
            </FieldRow>
            <FieldRow label="Tagline" hint="One-line description">
              <TextInput value={draft.tagline} onChange={(v) => setField("tagline", v)} placeholder="cryptically designed…" />
            </FieldRow>

            <div className="mt-5">
              <SectionLabel label="Colors" />
              <FieldRow label="Primary" hint="Ink, buttons">
                <ColorInput value={draft.colors.primary} onChange={(v) => setColor("primary", v)} label="Primary color" />
              </FieldRow>
              <FieldRow label="Accent" hint="Badges, links">
                <ColorInput value={draft.colors.accent} onChange={(v) => setColor("accent", v)} label="Accent color" />
              </FieldRow>
              <FieldRow label="Surface" hint="Page background tint">
                <ColorInput value={draft.colors.surface} onChange={(v) => setColor("surface", v)} label="Surface color" />
              </FieldRow>
            </div>

            <div className="mt-5">
              <SectionLabel label="Typography" />
              <FieldRow label="Display font" hint="Headings, wordmark">
                <FontSelect value={draft.fonts.display} onChange={(v) => setFont("display", v)} options={DISPLAY_FONTS} />
              </FieldRow>
              <FieldRow label="UI font" hint="Body, labels, buttons">
                <FontSelect value={draft.fonts.ui} onChange={(v) => setFont("ui", v)} options={UI_FONTS} />
              </FieldRow>
            </div>
          </div>

          {/* Right — preview */}
          <div className="flex flex-col gap-4">

            {/* Token swatches */}
            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: "hsl(var(--theme-surface-paper) / 0.85)",
                border: "1px solid var(--theme-border-soft)",
                backdropFilter: "blur(8px)",
              }}
            >
              <SectionLabel label="Resolved Tokens — Light Mode" />
              <TokenSwatch tokens={previewTokens} />
            </div>

            {/* Live preview card */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "hsl(var(--theme-surface-paper) / 0.85)",
                border: "1px solid var(--theme-border-soft)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                className="flex flex-col items-center justify-center py-10 px-6 text-center"
                style={{ background: draft.colors.surface, minHeight: 140 }}
              >
                <div
                  className="text-3xl font-bold mb-1"
                  style={{ fontFamily: `"${draft.fonts.display}", serif`, color: draft.colors.primary }}
                >
                  {draft.wordmark || "KE3P"}
                </div>
                <div
                  className="text-sm"
                  style={{ fontFamily: `"${draft.fonts.ui}", sans-serif`, color: `${draft.colors.primary}99` }}
                >
                  {draft.tagline || "your tagline here"}
                </div>
              </div>
              <div
                className="flex items-center gap-3 px-5 py-2.5"
                style={{ background: draft.colors.primary }}
              >
                <span
                  className="rounded px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: draft.colors.accent, color: "#fff", fontFamily: `"${draft.fonts.ui}", sans-serif` }}
                >
                  Accent
                </span>
                <span className="text-[11px]" style={{ color: "#ffffff99", fontFamily: `"${draft.fonts.ui}", sans-serif` }}>
                  Primary surface
                </span>
              </div>
            </div>

            {/* Raw JSON */}
            <div
              className="rounded-2xl px-5 py-4"
              style={{
                background: "hsl(var(--theme-surface-paper) / 0.85)",
                border: "1px solid var(--theme-border-soft)",
                backdropFilter: "blur(8px)",
              }}
            >
              <SectionLabel label="Raw JSON" />
              <pre
                className="text-[11px] overflow-x-auto"
                style={{ color: "var(--theme-ink-secondary)", fontFamily: "monospace" }}
              >
                {JSON.stringify(draft, null, 2)}
              </pre>
            </div>

          </div>
        </div>
      )}
    </DesignFrame>
  )
}
