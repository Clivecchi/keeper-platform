"use client"

/**
 * ThemeFrame
 *
 * A Designer Board-adjacent surface for editing a domain's DomainFrameTheme:
 * wordmark, tagline, background image path, primary/accent/surface colors, and
 * display/ui fonts.
 *
 * Route: /d/:slug?frame=theme (admin-only)
 *
 * Changes are persisted via PATCH /api/domains/:slug/frame and hot-reloaded
 * into the shell without a full page refresh.
 */

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { StyleScope } from "../../styles/StyleScope"
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

// Google Fonts available in the theme system
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
  // Quick validation — returns hex if it can't parse
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex.replace("#", "").padStart(6, "0"))
  if (!match) return hex
  const r = parseInt(match[1].slice(0, 2), 16) / 255
  const g = parseInt(match[1].slice(2, 4), 16) / 255
  const b = parseInt(match[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
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

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "#f3f4f6" }} />
    </div>
  )
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 items-start py-3" style={{ borderBottom: "1px solid #f3f4f6" }}>
      <div>
        <div className="text-[13px] font-medium" style={{ color: "#374151" }}>{label}</div>
        {hint && <div className="text-[11px] mt-0.5" style={{ color: "#9ca3af" }}>{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md px-3 py-2 text-[13px] outline-none transition-shadow"
      style={{
        border: "1px solid #e5e7eb",
        color: "#111827",
        background: "#ffffff",
      }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 2px #3b82f680" }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = "none" }}
    />
  )
}

function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (v: string) => void
  label: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="relative shrink-0 rounded-md overflow-hidden cursor-pointer"
        style={{ width: 40, height: 40, border: "1px solid #e5e7eb" }}
        title={`Pick ${label} color`}
      >
        <div
          className="absolute inset-0"
          style={{ background: value }}
        />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          aria-label={label}
        />
      </div>
      <TextInput value={value} onChange={onChange} placeholder="#000000" />
      <div
        className="text-[11px] shrink-0"
        style={{ color: "#9ca3af", minWidth: 140 }}
      >
        {hexToHSLString(value)}
      </div>
    </div>
  )
}

function FontSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md px-3 py-2 text-[13px] outline-none"
      style={{
        border: "1px solid #e5e7eb",
        color: "#111827",
        background: "#ffffff",
      }}
    >
      {options.map((f) => (
        <option key={f} value={f} style={{ fontFamily: f }}>
          {f}
        </option>
      ))}
    </select>
  )
}

function TokenSwatchRow({ tokens }: { tokens: Record<string, string> }) {
  const colorKeys = [
    "surface.page",
    "surface.paper",
    "ink.primary",
    "ink.secondary",
    "dialogue.userBg",
    "dialogue.agentBg",
  ]
  return (
    <div className="flex flex-wrap gap-2">
      {colorKeys.map((key) => {
        const raw = tokens[key]
        if (!raw) return null
        // tokens are stored as "H S% L%" (no hsl wrapper)
        const color = raw.includes("hsl") ? raw : `hsl(${raw})`
        return (
          <div key={key} className="flex flex-col items-center gap-1">
            <div
              className="rounded-md"
              style={{
                width: 36,
                height: 36,
                background: color,
                border: "1px solid rgba(0,0,0,0.08)",
              }}
              title={`${key}: ${raw}`}
            />
            <span
              className="text-[9px] text-center"
              style={{ color: "#9ca3af", maxWidth: 50, wordBreak: "break-all" }}
            >
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

export function ThemeFrame({ styleId = "neutral", themeSlug }: ThemeFrameProps) {
  const { domainSlug, domainFrame, reloadDomainFrame, navigateToFrame } = useV0Shell()
  const { isAdmin } = useAuth()

  const defaultTheme: DomainFrameTheme = {
    wordmark: "",
    tagline: "",
    background: "",
    colors: { primary: "#2d6a7f", accent: "#b8963e", surface: "#fdfaf4" },
    fonts: { display: "Cormorant Garamond", ui: "Outfit" },
  }

  const [draft, setDraft] = React.useState<DomainFrameTheme>(
    domainFrame?.theme ?? defaultTheme
  )
  const [saving, setSaving] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saved" | "error">("idle")

  // Sync from domainFrame when it loads or reloads
  React.useEffect(() => {
    if (domainFrame?.theme) {
      setDraft(domainFrame.theme)
    }
  }, [domainFrame?.theme])

  // Live token preview from the current draft
  const previewTokens = React.useMemo(
    () => resolveDomainThemeSync(draft, "light"),
    [draft]
  )

  const updateColor = (key: keyof DomainFrameTheme["colors"], value: string) => {
    setDraft((prev) => ({ ...prev, colors: { ...prev.colors, [key]: value } }))
    setSaveStatus("idle")
  }

  const updateFont = (key: keyof DomainFrameTheme["fonts"], value: string) => {
    setDraft((prev) => ({ ...prev, fonts: { ...prev.fonts, [key]: value } }))
    setSaveStatus("idle")
  }

  const updateField = <K extends keyof DomainFrameTheme>(
    key: K,
    value: DomainFrameTheme[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
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

  if (!isAdmin) {
    return (
      <StyleScope styleId={styleId} themeSlug={themeSlug}>
        <div className="flex min-h-screen items-center justify-center" style={{ background: "#f9fafb" }}>
          <div className="rounded-xl border p-8 text-center" style={{ borderColor: "#e5e7eb", background: "#ffffff" }}>
            <p className="text-sm font-medium" style={{ color: "#374151" }}>Admin access required</p>
            <p className="mt-1 text-xs" style={{ color: "#9ca3af" }}>Theme editing is available to platform admins only.</p>
          </div>
        </div>
      </StyleScope>
    )
  }

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <div className="flex flex-col min-h-screen" style={{ background: "#f9fafb" }}>

        {/* ── Header ── */}
        <div
          className="shrink-0 flex items-center justify-between px-6"
          style={{
            height: 56,
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigateToFrame("agent")}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-gray-100"
              style={{ color: "#374151" }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <div className="h-4 w-px" style={{ background: "#e5e7eb" }} />
            <span className="text-[13px] font-medium" style={{ color: "#111827" }}>
              Theme Editor
            </span>
            <span
              className="text-[10px] font-bold uppercase tracking-widest rounded px-2 py-0.5"
              style={{ background: "#f3f4f6", color: "#6b7280" }}
            >
              {domainSlug}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus === "saved" && (
              <span className="text-[12px] font-medium" style={{ color: "#16a34a" }}>
                ✓ Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-[12px] font-medium" style={{ color: "#dc2626" }}>
                Save failed — try again
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md px-4 py-2 text-[13px] font-medium transition-colors disabled:opacity-60"
              style={{
                background: saving ? "#e5e7eb" : "#111827",
                color: saving ? "#6b7280" : "#ffffff",
              }}
            >
              {saving ? "Saving…" : "Save Theme"}
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0">

          {/* Editor panel */}
          <div
            className="flex flex-col overflow-y-auto"
            style={{
              width: 600,
              minWidth: 480,
              background: "#ffffff",
              borderRight: "1px solid #e5e7eb",
            }}
          >
            <div className="px-8 py-6">

              {/* Identity */}
              <SectionHeader label="Identity" />
              <FieldRow label="Wordmark" hint="Short domain name shown in headers">
                <TextInput
                  value={draft.wordmark}
                  onChange={(v) => updateField("wordmark", v)}
                  placeholder="KE3P"
                />
              </FieldRow>
              <FieldRow label="Tagline" hint="One-line domain description">
                <TextInput
                  value={draft.tagline}
                  onChange={(v) => updateField("tagline", v)}
                  placeholder="cryptically designed, wonderfully underfolded"
                />
              </FieldRow>
              <FieldRow label="Background" hint="Cover image path or URL">
                <TextInput
                  value={draft.background}
                  onChange={(v) => updateField("background", v)}
                  placeholder="/images/keeper-dawn.jpg"
                />
              </FieldRow>

              {/* Colors */}
              <div className="mt-8">
                <SectionHeader label="Colors" />
                <FieldRow label="Primary" hint="Main brand color — ink, buttons">
                  <ColorInput
                    value={draft.colors.primary}
                    onChange={(v) => updateColor("primary", v)}
                    label="Primary color"
                  />
                </FieldRow>
                <FieldRow label="Accent" hint="Highlight color — badges, links">
                  <ColorInput
                    value={draft.colors.accent}
                    onChange={(v) => updateColor("accent", v)}
                    label="Accent color"
                  />
                </FieldRow>
                <FieldRow label="Surface" hint="Base page background color">
                  <ColorInput
                    value={draft.colors.surface}
                    onChange={(v) => updateColor("surface", v)}
                    label="Surface color"
                  />
                </FieldRow>
              </div>

              {/* Typography */}
              <div className="mt-8">
                <SectionHeader label="Typography" />
                <FieldRow label="Display font" hint="Headings, wordmark">
                  <FontSelect
                    value={draft.fonts.display}
                    onChange={(v) => updateFont("display", v)}
                    options={DISPLAY_FONTS}
                  />
                </FieldRow>
                <FieldRow label="UI font" hint="Body, labels, buttons">
                  <FontSelect
                    value={draft.fonts.ui}
                    onChange={(v) => updateFont("ui", v)}
                    options={UI_FONTS}
                  />
                </FieldRow>
              </div>

            </div>
          </div>

          {/* Preview panel */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="px-8 py-6">

              {/* Token swatches */}
              <SectionHeader label="Resolved Tokens — Light Mode" />
              <TokenSwatchRow tokens={previewTokens} />

              {/* Live preview card */}
              <div className="mt-8">
                <SectionHeader label="Live Preview" />
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  {/* Cover-style preview */}
                  <div
                    className="flex flex-col items-center justify-center py-12 px-8 text-center"
                    style={{
                      background: draft.colors.surface,
                      minHeight: 180,
                    }}
                  >
                    <div
                      className="text-4xl font-bold mb-2"
                      style={{
                        fontFamily: `"${draft.fonts.display}", serif`,
                        color: draft.colors.primary,
                      }}
                    >
                      {draft.wordmark || "KE3P"}
                    </div>
                    <div
                      className="text-sm"
                      style={{
                        fontFamily: `"${draft.fonts.ui}", sans-serif`,
                        color: draft.colors.primary + "99",
                      }}
                    >
                      {draft.tagline || "your tagline here"}
                    </div>
                  </div>

                  {/* Bottom strip */}
                  <div
                    className="flex items-center gap-3 px-6 py-3"
                    style={{ background: draft.colors.primary }}
                  >
                    <div
                      className="rounded px-3 py-1 text-xs font-semibold"
                      style={{
                        fontFamily: `"${draft.fonts.ui}", sans-serif`,
                        background: draft.colors.accent,
                        color: "#ffffff",
                      }}
                    >
                      Accent
                    </div>
                    <span
                      className="text-xs"
                      style={{
                        fontFamily: `"${draft.fonts.ui}", sans-serif`,
                        color: "#ffffff99",
                      }}
                    >
                      Primary surface
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw JSON for advanced users */}
              <div className="mt-8">
                <SectionHeader label="Raw JSON (read-only)" />
                <pre
                  className="rounded-lg p-4 text-[11px] overflow-x-auto"
                  style={{
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    color: "#374151",
                    fontFamily: "monospace",
                  }}
                >
                  {JSON.stringify(draft, null, 2)}
                </pre>
              </div>

            </div>
          </div>
        </div>
      </div>
    </StyleScope>
  )
}
