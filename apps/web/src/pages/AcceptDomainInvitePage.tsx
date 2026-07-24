"use client"

import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { apiFetch } from "../lib/api"
import { useAuth } from "../context/AuthContext"

/**
 * Redeem a DomainInvitation token from Cast Header Invite's copyable link.
 * Mounted behind ProtectedRoute — user is already signed in.
 */
export default function AcceptDomainInvitePage() {
  const [params] = useSearchParams()
  const token = params.get("token")?.trim() ?? ""
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = React.useState<"idle" | "working" | "ok" | "error">("idle")
  const [message, setMessage] = React.useState<string | null>(null)

  const accept = React.useCallback(async () => {
    if (!token) {
      setStatus("error")
      setMessage("Missing invitation token.")
      return
    }
    setStatus("working")
    try {
      await apiFetch("/api/domains/invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      })
      setStatus("ok")
      setMessage("Invitation accepted. You now have access to that domain.")
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
          onClick={() => navigate("/home")}
        >
          Go to home
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
