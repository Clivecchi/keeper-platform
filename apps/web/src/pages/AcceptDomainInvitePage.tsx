"use client"

import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"

/**
 * Redeem a DomainInvitation token. Mounted behind ProtectedRoute — user is already signed in.
 */
export default function AcceptDomainInvitePage() {
  const [params] = useSearchParams()
  const token = params.get("token")?.trim() ?? ""
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<"idle" | "working" | "ok" | "error">("idle")
  const [message, setMessage] = React.useState<string | null>(null)
  const [domainSlug, setDomainSlug] = React.useState<string | null>(null)

  const accept = React.useCallback(async () => {
    if (!token) {
      setStatus("error")
      setMessage("Missing invitation token.")
      return
    }
    setStatus("working")
    try {
      const data = (await apiFetch("/api/domains/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      })) as { domainSlug?: string; additionalAccepted?: number }
      const slug = data.domainSlug?.trim() || null
      setDomainSlug(slug)
      setStatus("ok")
      const extra =
        typeof data.additionalAccepted === "number" && data.additionalAccepted > 0
          ? ` Also joined ${data.additionalAccepted} more Domain${data.additionalAccepted === 1 ? "" : "s"} from the same invitation.`
          : ""
      setMessage(`Invitation accepted. You now have access to that Domain.${extra}`)
    } catch (err) {
      setStatus("error")
      setMessage(err instanceof Error ? err.message : "Could not accept invitation.")
    }
  }, [token])

  React.useEffect(() => {
    if (!user) return
    if (!token) {
      setStatus("error")
      setMessage("Missing invitation token.")
      return
    }
    if (status !== "idle") return
    void accept()
  }, [user, token, status, accept])

  return (
    <div className="mx-auto max-w-md px-4 py-16 space-y-3 text-[14px]">
      <h1 className="text-[18px] font-medium">Accept invitation</h1>
      {status === "working" || status === "idle" ? <p>Accepting…</p> : null}
      {message ? <p>{message}</p> : null}
      {status === "ok" ? (
        <button
          type="button"
          className="underline underline-offset-2"
          onClick={() => navigate(domainSlug ? `/d/${encodeURIComponent(domainSlug)}?board=domain` : "/home")}
        >
          {domainSlug ? "Open that Domain" : "Go to home"}
        </button>
      ) : null}
      {status === "error" && token ? (
        <button type="button" className="underline underline-offset-2" onClick={() => void accept()}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
