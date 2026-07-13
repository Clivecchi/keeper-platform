"use client"

import * as React from "react"
import { createDomain, suggestDomainSlug } from "./domainSwitcherData"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
} from "./domainSwitcherTheme"

export interface DomainAddPanelProps {
  onClose: () => void
  onBack: () => void
  onCreated: (slug: string) => void
}

export function DomainAddPanel({ onClose, onBack, onCreated }: DomainAddPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [slugTouched, setSlugTouched] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const suggestedSlug = suggestDomainSlug(name)

  React.useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      const anchor = document.querySelector(".keeper-topbar-playbill-anchor")
      if (anchor?.contains(event.target as Node)) return
      if (panelRef.current?.contains(event.target as Node)) return
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onBack()
    }
    document.addEventListener("mousedown", handleMouseDown)
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("mousedown", handleMouseDown)
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onBack, onClose])

  const handleNameChange = (value: string) => {
    setName(value)
    if (!slugTouched) {
      setSlug(suggestDomainSlug(value))
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Domain name is required.")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const created = await createDomain({
        name: trimmedName,
        description: description.trim() || undefined,
        slug: slug.trim() || undefined,
      })
      onCreated(created.slug)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create domain.")
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
    background: "hsl(220 14% 8% / 0.6)",
    color: SWITCHER_INK_PRIMARY,
  }

  return (
    <div ref={panelRef} className="keeper-topbar-playbill-dropdown" role="form" aria-label="Add a domain">
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: "0.5px solid hsla(38, 20%, 28%, 0.45)" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="text-[10px] font-medium transition-opacity hover:opacity-80"
          style={{ color: SWITCHER_INK_SECONDARY }}
        >
          ← Domains
        </button>
      </div>

      <form className="flex flex-col gap-3 px-3 py-3" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label
              className="block text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: SWITCHER_INK_MUTED }}
              htmlFor="domain-add-name"
            >
              Name
            </label>
            <input
              id="domain-add-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              disabled={submitting}
              placeholder="My Project Domain"
              className="w-full rounded-md px-2 py-1.5 text-[11px] outline-none"
              style={inputStyle}
              autoFocus
            />
          </div>

          <div>
            <label
              className="block text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: SWITCHER_INK_MUTED }}
              htmlFor="domain-add-slug"
            >
              Slug
            </label>
            <input
              id="domain-add-slug"
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true)
                setSlug(e.target.value)
              }}
              disabled={submitting}
              placeholder={suggestedSlug || "my-project-realm"}
              className="w-full rounded-md px-2 py-1.5 text-[11px] outline-none font-mono"
              style={inputStyle}
            />
            {suggestedSlug && slug !== suggestedSlug ? (
              <p className="mt-1 text-[9px]" style={{ color: SWITCHER_INK_MUTED }}>
                Suggested: {suggestedSlug}
              </p>
            ) : null}
          </div>

          <div>
            <label
              className="block text-[10px] font-semibold uppercase tracking-widest mb-1"
              style={{ color: SWITCHER_INK_MUTED }}
              htmlFor="domain-add-description"
            >
              Description
            </label>
            <textarea
              id="domain-add-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={submitting}
              rows={2}
              placeholder="Optional — what this domain is for"
              className="w-full rounded-md px-2 py-1.5 text-[11px] outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {error ? (
            <p className="text-[10px] leading-snug" style={{ color: "hsl(0 72% 72%)" }}>
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="w-full rounded-md py-2 text-[11px] font-medium transition-opacity disabled:opacity-40"
            style={{
              background: "#6ee7b7",
              color: "hsl(220 18% 10%)",
            }}
          >
            {submitting ? "Creating…" : "Create domain"}
          </button>
        </form>
    </div>
  )
}
