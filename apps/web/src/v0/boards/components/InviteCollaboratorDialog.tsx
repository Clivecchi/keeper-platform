"use client"

/**
 * Invite a second human onto the current domain.
 * People and profile menus reuse this dialog — one invitation system.
 * Email delivery is not wired; new emails get a copyable accept link.
 */

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { invitationAcceptUrl } from "../../presence/cover/domainPeople"

export interface InviteCollaboratorDialogProps {
  domainId: string
  open: boolean
  onClose: () => void
  onSettled?: (outcome: "granted" | "invited") => void
}

type InviteOutcome =
  | { kind: "idle" }
  | { kind: "working" }
  | { kind: "granted"; name: string }
  | { kind: "invited"; email: string; acceptUrl: string }
  | { kind: "error"; message: string }

export function InviteCollaboratorDialog({
  domainId,
  open,
  onClose,
  onSettled,
}: InviteCollaboratorDialogProps) {
  const [identifier, setIdentifier] = React.useState("")
  const [role, setRole] = React.useState<"connection" | "friend">("connection")
  const [outcome, setOutcome] = React.useState<InviteOutcome>({ kind: "idle" })
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "failed">("idle")

  React.useEffect(() => {
    if (!open) {
      setIdentifier("")
      setRole("connection")
      setOutcome({ kind: "idle" })
      setCopyState("idle")
    }
  }, [open])

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault()
      const trimmed = identifier.trim()
      if (!trimmed) {
        setOutcome({ kind: "error", message: "Enter an email or display name." })
        return
      }
      setOutcome({ kind: "working" })
      setCopyState("idle")
      try {
        const data = (await apiFetch(
          `/api/domains/${encodeURIComponent(domainId)}/connections/invite`,
          {
            method: "POST",
            body: JSON.stringify({ identifier: trimmed, role }),
          },
        )) as {
          outcome?: string
          permission?: { userId?: string }
          invitation?: {
            id?: string
            email?: string
            token?: string
            acceptPath?: string
          }
          error?: string
        }

        if (data.outcome === "granted") {
          setOutcome({
            kind: "granted",
            name: trimmed,
          })
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
          setOutcome({
            kind: "invited",
            email,
            acceptUrl,
          })
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
    },
    [domainId, identifier, onSettled, role],
  )

  const handleCopyAgain = async (acceptUrl: string) => {
    try {
      await navigator.clipboard.writeText(acceptUrl)
      setCopyState("copied")
    } catch {
      setCopyState("failed")
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ background: "hsla(var(--theme-ink) / 0.35)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Invite collaborator"
    >
      <div
        className="my-auto w-full max-w-md max-h-[min(32rem,calc(100vh-2rem))] overflow-y-auto overscroll-contain rounded-lg border p-4 shadow-lg"
        style={{
          background: "hsl(var(--theme-surface))",
          borderColor: "hsl(var(--theme-border))",
          color: "hsl(var(--theme-ink))",
        }}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-medium">Invite a collaborator</h2>
            <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Existing Keeper accounts become members immediately. New emails get a copyable
              acceptance link — Keeper does not send email yet.
            </p>
          </div>
          <button
            type="button"
            className="text-[12px] underline underline-offset-2"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <form className="flex flex-col gap-3" onSubmit={(e) => void handleSubmit(e)}>
          <label className="flex flex-col gap-1 text-[12px]">
            <span style={{ color: "hsl(var(--theme-ink-secondary))" }}>Email or display name</span>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="rounded border px-2 py-1.5 text-[13px]"
              style={{
                background: "hsl(var(--theme-bg))",
                borderColor: "hsl(var(--theme-border))",
                color: "hsl(var(--theme-ink))",
              }}
              placeholder="name@example.com"
              autoFocus
              disabled={outcome.kind === "working"}
            />
          </label>

          <label className="flex flex-col gap-1 text-[12px]">
            <span style={{ color: "hsl(var(--theme-ink-secondary))" }}>Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "connection" | "friend")}
              className="rounded border px-2 py-1.5 text-[13px]"
              style={{
                background: "hsl(var(--theme-bg))",
                borderColor: "hsl(var(--theme-border))",
                color: "hsl(var(--theme-ink))",
              }}
              disabled={outcome.kind === "working"}
            >
              <option value="connection">Connection — read-only access</option>
              <option value="friend">Friend — collaborator with limited write access</option>
            </select>
          </label>

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
        </form>

        {outcome.kind === "granted" ? (
          <p className="mt-3 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {outcome.name} is now a member of this domain.
          </p>
        ) : null}
        {outcome.kind === "invited" ? (
          <div className="mt-3 space-y-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            <p>Invitation created for {outcome.email}. Keeper did not send email.</p>
            {outcome.acceptUrl ? (
              <>
                <p>
                  {copyState === "copied"
                    ? "Acceptance link copied to clipboard:"
                    : "Share this acceptance link:"}
                </p>
                <code
                  className="block break-all rounded border px-2 py-1 text-[11px]"
                  style={{
                    borderColor: "hsl(var(--theme-border))",
                    background: "hsl(var(--theme-bg))",
                  }}
                >
                  {outcome.acceptUrl}
                </code>
                <button
                  type="button"
                  className="text-[12px] underline underline-offset-2"
                  onClick={() => void handleCopyAgain(outcome.acceptUrl)}
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
          <p className="mt-3 text-[12px]" style={{ color: "hsl(var(--theme-danger, 0 70% 45%))" }}>
            {outcome.message}
          </p>
        ) : null}
      </div>
    </div>
  )
}
