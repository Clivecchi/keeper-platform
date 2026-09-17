"use client"

/**
 * Chronicle People invite form — not a popup.
 * Email or display name, Domain relationship, briefing for the lead, optional extra Domains.
 */

import * as React from "react"
import {
  assignableDomainRoles,
  INVITATION_SEED_LIMITS,
  normalizeInvitationSeed,
  resolveDomainRoleCatalog,
  type DomainRoleCatalogEntry,
  type InvitationBriefingKind,
} from "@keeper/shared"
import { apiFetch } from "../../../lib/api"
import { invitationAcceptUrl } from "./domainPeople"

export interface DomainInvitePanelProps {
  domainId: string
  roles?: DomainRoleCatalogEntry[]
  onClose: () => void
  onSettled?: (outcome: "granted" | "invited") => void
}

type InviteOutcome =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "granted"; name: string }
  | { kind: "invited"; email: string; acceptUrl: string; additionalNote?: string }
  | { kind: "error"; message: string }

interface AdministrableDomain {
  id: string
  name: string
  slug: string
  via: "owner" | "admin"
}

interface BriefingDraft {
  kind: InvitationBriefingKind
  title: string
  body: string
}

const inputStyle: React.CSSProperties = {
  border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
  background: "var(--treatment-paper, hsl(var(--theme-surface-paper)))",
  color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
}

const quietStyle: React.CSSProperties = {
  color: "hsl(var(--theme-ink-secondary))",
}

export function DomainInvitePanel({ domainId, roles, onClose, onSettled }: DomainInvitePanelProps) {
  const catalog = React.useMemo(
    () => (roles && roles.length > 0 ? roles : resolveDomainRoleCatalog({})),
    [roles],
  )
  const assignable = React.useMemo(() => assignableDomainRoles(catalog), [catalog])
  const [identifier, setIdentifier] = React.useState("")
  const [role, setRole] = React.useState(assignable[assignable.length - 1]?.key ?? "connection")

  React.useEffect(() => {
    setRole((current) => (
      assignable.some((entry) => entry.key === current)
        ? current
        : (assignable[assignable.length - 1]?.key ?? "connection")
    ))
  }, [assignable])
  const [givenName, setGivenName] = React.useState("")
  const [relation, setRelation] = React.useState("")
  const [about, setAbout] = React.useState("")
  const [briefing, setBriefing] = React.useState<BriefingDraft[]>([])
  const [additionalDomainIds, setAdditionalDomainIds] = React.useState<string[]>([])
  const [targets, setTargets] = React.useState<AdministrableDomain[]>([])
  const [outcome, setOutcome] = React.useState<InviteOutcome>({ kind: "idle" })
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle")

  React.useEffect(() => {
    let cancelled = false
    apiFetch(`/api/domains/administrable?exclude=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const payload = res as { domains?: AdministrableDomain[] }
        setTargets(Array.isArray(payload.domains) ? payload.domains : [])
      })
      .catch(() => {
        if (!cancelled) setTargets([])
      })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const addBriefing = (kind: InvitationBriefingKind) => {
    if (briefing.length >= INVITATION_SEED_LIMITS.briefingCount) return
    setBriefing((current) => [...current, { kind, title: "", body: "" }])
  }

  const updateBriefing = (index: number, patch: Partial<BriefingDraft>) => {
    setBriefing((current) => current.map((note, i) => (i === index ? { ...note, ...patch } : note)))
  }

  const removeBriefing = (index: number) => {
    setBriefing((current) => current.filter((_, i) => i !== index))
  }

  const toggleAdditionalDomain = (id: string) => {
    setAdditionalDomainIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = identifier.trim()
    if (!trimmed) {
      setOutcome({ kind: "error", message: "Enter an email or display name." })
      return
    }
    setOutcome({ kind: "working" })
    setCopyState("idle")
    try {
      const seed = normalizeInvitationSeed({
        givenName,
        relation,
        about,
        briefing: briefing
          .map((note) => ({
            kind: note.kind,
            title: note.title.trim() || undefined,
            body: note.body,
          }))
          .filter((note) => note.body.trim()),
      })
      const data = (await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/connections/invite`,
        {
          method: "POST",
          body: JSON.stringify({
            identifier: trimmed,
            role,
            ...(seed ? { seed } : {}),
            ...(additionalDomainIds.length > 0 ? { additionalDomainIds } : {}),
          }),
        },
      )) as {
        outcome?: string
        invitation?: {
          email?: string
          token?: string
          acceptPath?: string
        }
        additional?: Array<{ outcome: string; name?: string; error?: string }>
        error?: string
      }

      const additionalNote = formatAdditionalNote(data.additional)

      if (data.outcome === "granted") {
        setOutcome({ kind: "granted", name: trimmed })
        onSettled?.("granted")
        return
      }

      if (data.outcome === "invited" && data.invitation) {
        const email = data.invitation.email ?? trimmed
        const acceptUrl =
          invitationAcceptUrl(
            data.invitation.acceptPath
              ?? (data.invitation.token
                ? `/invite/accept?token=${encodeURIComponent(data.invitation.token)}`
                : null),
          ) ?? ""
        setOutcome({ kind: "invited", email, acceptUrl, additionalNote })
        if (acceptUrl) {
          try {
            await navigator.clipboard.writeText(acceptUrl)
            setCopyState("copied")
          } catch {
            setCopyState("failed")
          }
        }
        onSettled?.("invited")
        return
      }

      setOutcome({
        kind: "error",
        message: data.error ?? "Invitation could not be created.",
      })
    } catch (err) {
      setOutcome({
        kind: "error",
        message: err instanceof Error ? err.message : "Invitation could not be created.",
      })
    }
  }

  return (
    <form className="rounded-md p-3 mb-3 space-y-3" style={{ ...inputStyle, background: "var(--treatment-paper, hsl(var(--theme-surface-elevated)))" }} onSubmit={(e) => void handleSubmit(e)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-medium">Invite someone</p>
          <p className="mt-1 text-[12px]" style={quietStyle}>
            Existing Keeper accounts join immediately. New emails get a copyable acceptance
            link — Keeper does not send email yet. This Domain is recorded as the one that invited them.
          </p>
        </div>
        <button
          type="button"
          className="text-[12px] underline underline-offset-2 shrink-0"
          style={quietStyle}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>

      <label className="flex flex-col gap-1 text-[12px]">
        <span style={quietStyle}>Email or display name</span>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="rounded border px-2 py-1.5 text-[13px]"
          style={inputStyle}
          placeholder="name@example.com"
          autoFocus
          disabled={outcome.kind === "working"}
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px]">
        <span style={quietStyle}>Relationship on this Domain</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded border px-2 py-1.5 text-[13px]"
          style={inputStyle}
          disabled={outcome.kind === "working"}
        >
          {assignable.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label} — {option.description}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-[12px]">
        <span style={quietStyle}>What to call them</span>
        <input
          value={givenName}
          onChange={(e) => setGivenName(e.target.value)}
          className="rounded border px-2 py-1.5 text-[13px]"
          style={inputStyle}
          placeholder="Pat Lee"
          disabled={outcome.kind === "working"}
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px]">
        <span style={quietStyle}>How they belong</span>
        <input
          value={relation}
          onChange={(e) => setRelation(e.target.value)}
          className="rounded border px-2 py-1.5 text-[13px]"
          style={inputStyle}
          placeholder="Colleague from the studio"
          disabled={outcome.kind === "working"}
        />
      </label>

      <label className="flex flex-col gap-1 text-[12px]">
        <span style={quietStyle}>What the lead should know</span>
        <textarea
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          rows={3}
          className="rounded border px-2 py-1.5 text-[13px] resize-y"
          style={inputStyle}
          placeholder="Knows the Cover work. Speaks for the live Domain."
          disabled={outcome.kind === "working"}
        />
      </label>

      <div className="space-y-2">
        <p className="text-[12px]" style={quietStyle}>
          Briefing for the lead — notes, prompts, or short documents. Stays with this Domain
          until co-ownership exists.
        </p>
        {briefing.map((note, index) => (
          <div key={`${note.kind}-${index}`} className="space-y-1 rounded border p-2" style={inputStyle}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={quietStyle}>
                {note.kind === "prompt" ? "Prompt" : note.kind === "document" ? "Document" : "Note"}
              </span>
              <button
                type="button"
                className="text-[11px] underline"
                style={quietStyle}
                onClick={() => removeBriefing(index)}
              >
                Remove
              </button>
            </div>
            <input
              value={note.title}
              onChange={(e) => updateBriefing(index, { title: e.target.value })}
              className="w-full rounded border px-2 py-1 text-[12px]"
              style={inputStyle}
              placeholder="Title (optional)"
              disabled={outcome.kind === "working"}
            />
            <textarea
              value={note.body}
              onChange={(e) => updateBriefing(index, { body: e.target.value })}
              rows={3}
              className="w-full rounded border px-2 py-1.5 text-[12px] resize-y"
              style={inputStyle}
              placeholder={
                note.kind === "prompt"
                  ? "How the lead should meet them."
                  : "What belongs with this invitation."
              }
              disabled={outcome.kind === "working"}
            />
          </div>
        ))}
        {briefing.length < INVITATION_SEED_LIMITS.briefingCount ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="text-[12px] underline" style={quietStyle} onClick={() => addBriefing("note")}>
              Add note
            </button>
            <button type="button" className="text-[12px] underline" style={quietStyle} onClick={() => addBriefing("prompt")}>
              Add prompt
            </button>
            <button type="button" className="text-[12px] underline" style={quietStyle} onClick={() => addBriefing("document")}>
              Add document
            </button>
          </div>
        ) : null}
      </div>

      {targets.length > 0 ? (
        <fieldset className="space-y-1.5">
          <legend className="text-[12px]" style={quietStyle}>
            Also invite onto other Domains you administer
          </legend>
          {targets.map((target) => (
            <label key={target.id} className="flex items-center gap-2 text-[12px]">
              <input
                type="checkbox"
                checked={additionalDomainIds.includes(target.id)}
                onChange={() => toggleAdditionalDomain(target.id)}
                disabled={outcome.kind === "working"}
              />
              <span>
                {target.name}
                <span style={{ color: "hsl(var(--theme-ink-tertiary))" }}> · {target.slug}</span>
              </span>
            </label>
          ))}
        </fieldset>
      ) : null}

      <button
        type="submit"
        className="rounded px-3 py-1.5 text-[13px]"
        style={{
          background: "hsl(var(--theme-ink))",
          color: "hsl(var(--theme-surface))",
        }}
        disabled={outcome.kind === "working"}
      >
        {outcome.kind === "working" ? "Creating…" : "Create invitation"}
      </button>

      {outcome.kind === "granted" ? (
        <p className="text-[12px]" style={quietStyle}>
          {outcome.name} is now a member of this Domain.
        </p>
      ) : null}
      {outcome.kind === "invited" ? (
        <div className="space-y-1 text-[12px]" style={quietStyle}>
          <p>Invitation created for {outcome.email}. Keeper did not send email.</p>
          {outcome.additionalNote ? <p>{outcome.additionalNote}</p> : null}
          {outcome.acceptUrl ? (
            <>
              <p>
                {copyState === "copied"
                  ? "Acceptance link copied to clipboard:"
                  : "Share this acceptance link:"}
              </p>
              <code className="block break-all rounded border px-2 py-1 text-[11px]" style={inputStyle}>
                {outcome.acceptUrl}
              </code>
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => void navigator.clipboard.writeText(outcome.acceptUrl).then(
                  () => setCopyState("copied"),
                  () => setCopyState("failed"),
                )}
              >
                {copyState === "failed" ? "Copy failed — try again" : "Copy link"}
              </button>
            </>
          ) : (
            <p>The invitation is pending. Copy the link from People when it is available.</p>
          )}
        </div>
      ) : null}
      {outcome.kind === "error" ? (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}>
          {outcome.message}
        </p>
      ) : null}
    </form>
  )
}

function formatAdditionalNote(
  additional?: Array<{ outcome: string; name?: string; error?: string }>,
): string | undefined {
  if (!additional || additional.length === 0) return undefined
  const invited = additional.filter((row) => row.outcome === "granted" || row.outcome === "invited")
  const skipped = additional.filter((row) => row.outcome === "skipped")
  const parts: string[] = []
  if (invited.length > 0) {
    parts.push(`Also invited onto ${invited.map((row) => row.name || "another Domain").join(", ")}.`)
  }
  if (skipped.length > 0) {
    parts.push(`Skipped: ${skipped.map((row) => row.error || row.name || "a Domain").join("; ")}.`)
  }
  return parts.join(" ") || undefined
}
