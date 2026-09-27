"use client"

import * as React from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { apiFetch } from "../lib/api"
import { domainBoardPath, homeArrivalPath } from "../lib/invitationReturn"
import { useAuth } from "../context/AuthContext"

type ArrivalStatus = "pending" | "accepted" | "expired"

type ArrivalPreview = {
  status: ArrivalStatus
  domainName: string
  domainSlug: string
  roleLabel: string
  inviterName: string
  email: string
  hasAccount: boolean
  suggestedName: string | null
}

type AuthPayload = {
  success?: boolean
  data?: {
    user?: { id: string; email: string | null; name: string | null; avatar_url: string | null }
    token?: string
  }
  error?: string
}

function emailsMatch(left?: string | null, right?: string | null): boolean {
  const a = left?.trim().toLowerCase()
  const b = right?.trim().toLowerCase()
  return Boolean(a && b && a === b)
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message
  return fallback
}

/**
 * Public invitation arrival. Membership is granted here, after a real sign-in,
 * and the only landing is the inviting Domain.
 */
export default function AcceptDomainInvitePage() {
  const [params] = useSearchParams()
  const token = params.get("token")?.trim() ?? ""
  const { user, authResolved, isLoading, login, logout } = useAuth()
  const navigate = useNavigate()
  const [preview, setPreview] = React.useState<ArrivalPreview | null>(null)
  const [loadError, setLoadError] = React.useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = React.useState(true)
  const [name, setName] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [mode, setMode] = React.useState<"arrive" | "forgot">("arrive")
  const [busy, setBusy] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const entering = React.useRef(false)

  React.useEffect(() => {
    if (!token) {
      setLoadingPreview(false)
      setLoadError("This invitation link is missing its token.")
      return
    }
    let cancelled = false
    setLoadingPreview(true)
    apiFetch(`/api/domains/invitations/preview?token=${encodeURIComponent(token)}`)
      .then((data) => {
        if (cancelled || !data || typeof data !== "object") return
        const payload = data as ArrivalPreview
        if (!payload.domainName || !payload.domainSlug) {
          setLoadError("This invitation could not be read.")
          return
        }
        setPreview(payload)
        setName(payload.suggestedName?.trim() || "")
      })
      .catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err, "This invitation link is not valid."))
      })
      .finally(() => {
        if (!cancelled) setLoadingPreview(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const enterDomain = React.useCallback(
    (slug: string, dialogId?: string | null) => {
      navigate(domainBoardPath(slug, dialogId), { replace: true })
    },
    [navigate],
  )

  const acceptAndEnter = React.useCallback(async () => {
    const data = (await apiFetch("/api/domains/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    })) as {
      domainSlug?: string
      dialogId?: string
      homeRealmSlug?: string
      homeDialogId?: string
    }
    const homeSlug = data.homeRealmSlug?.trim()
    if (homeSlug) {
      navigate(homeArrivalPath(homeSlug, data.homeDialogId ?? data.dialogId), { replace: true })
      return
    }
    const slug = data.domainSlug?.trim() || preview?.domainSlug
    if (!slug) throw new Error("The invitation was accepted, but home could not be opened.")
    enterDomain(slug, data.dialogId)
  }, [enterDomain, navigate, preview?.domainSlug, token])

  React.useEffect(() => {
    if (!authResolved || isLoading || !preview || !user?.email) return
    if (!emailsMatch(user.email, preview.email)) return
    if (preview.status === "expired") return
    if (entering.current) return
    entering.current = true
    setBusy(true)
    setMessage(null)
    const run = async () => {
      await acceptAndEnter()
    }
    void run().catch((err) => {
      entering.current = false
      setBusy(false)
      setMessage(errorMessage(err, "Could not open the Domain."))
    })
  }, [acceptAndEnter, authResolved, enterDomain, isLoading, preview, user?.email])

  const signedInAsSomeoneElse = Boolean(
    preview && user?.email && !emailsMatch(user.email, preview.email),
  )
  const needsAccount = Boolean(preview && preview.status === "pending" && !preview.hasAccount)

  const handleArrive = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!preview || !token) return
    entering.current = true
    setBusy(true)
    setMessage(null)
    try {
      if (needsAccount) {
        const result = (await apiFetch("/api/kam/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            email: preview.email,
            password,
            invitationToken: token,
          }),
        })) as AuthPayload
        if (!result.success || !result.data?.user) {
          throw new Error(result.error || "Could not create the account.")
        }
        login(result.data)
        await acceptAndEnter()
        return
      }

      const result = (await apiFetch("/api/kam/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: preview.email, password }),
      })) as AuthPayload
      if (!result.success || !result.data?.user) {
        throw new Error(result.error || "Could not sign in.")
      }
      login(result.data)
      await acceptAndEnter()
    } catch (err) {
      const text = errorMessage(err, "Could not continue.")
      if (needsAccount && /already exists/i.test(text)) {
        setPreview({ ...preview, hasAccount: true })
        setMessage("An account already exists for this email. Sign in, or reset the password.")
      } else if (!needsAccount && /invalid credentials/i.test(text)) {
        setMessage("That password does not match this account. Reset it if you do not remember it.")
      } else {
        setMessage(text)
      }
      entering.current = false
      setBusy(false)
    }
  }

  const handleForgot = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!preview) return
    setBusy(true)
    setMessage(null)
    try {
      const result = (await apiFetch("/api/kam/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({
          email: preview.email,
          next: `/invite/accept?token=${encodeURIComponent(token)}`,
        }),
      })) as AuthPayload
      setNotice(result.data && "message" in (result.data as object)
        ? String((result.data as { message?: string }).message || "")
        : "If that email has a Keeper account, a reset link is on its way.")
      setMode("arrive")
    } catch (err) {
      setMessage(errorMessage(err, "Could not send a reset link."))
    } finally {
      setBusy(false)
    }
  }

  const handleSignOut = async () => {
    setBusy(true)
    try {
      await apiFetch("/api/kam/auth/logout", { method: "POST" })
    } catch {
      // Local session still needs to clear so the invited email can sign in.
    }
    logout()
    entering.current = false
    setBusy(false)
  }

  const title = !preview
    ? "Invitation"
    : preview.status === "expired"
      ? "This invitation expired"
      : preview.status === "accepted"
        ? `Open ${preview.domainName}`
        : `You're invited`

  const subtitle = !preview
    ? null
    : preview.status === "expired"
      ? `${preview.inviterName} invited you to ${preview.domainName}, and that link has expired. Ask them to send a new one.`
      : preview.status === "accepted"
        ? `This invitation to ${preview.domainName} was already accepted. Sign in as ${preview.email} to open it.`
        : `${preview.inviterName} invited you to ${preview.domainName} as ${preview.roleLabel}. ${
            needsAccount
              ? "Create your account to arrive there."
              : "Sign in to arrive there."
          }`

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold text-slate-900">{title}</h1>
          {subtitle ? <p className="text-slate-600">{subtitle}</p> : null}
        </div>

        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-200/70 px-8 py-7 backdrop-blur space-y-4">
          {loadingPreview || (isLoading && !loadError) ? <p className="text-sm text-slate-600">Opening the invitation…</p> : null}
          {loadError ? <p className="text-sm text-center text-red-700">{loadError}</p> : null}
          {notice ? <p className="text-sm text-slate-700">{notice}</p> : null}

          {preview && preview.status !== "expired" && signedInAsSomeoneElse ? (
            <div className="space-y-3 text-sm text-slate-700">
              <p>
                You are signed in as {user?.email}. This invitation is for {preview.email}.
              </p>
              <button
                type="button"
                onClick={() => void handleSignOut()}
                disabled={busy}
                className="w-full rounded-md bg-slate-900 py-3 text-white disabled:opacity-50"
              >
                Sign out and continue
              </button>
            </div>
          ) : null}

          {preview && preview.status !== "expired" && !user && mode === "forgot" ? (
            <form onSubmit={(event) => void handleForgot(event)} className="space-y-4">
              <p className="text-sm text-slate-600">
                A reset link will be sent to {preview.email}. It brings you back to this invitation.
              </p>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-slate-900 py-3 text-white disabled:opacity-50"
              >
                {busy ? "Sending…" : "Email a reset link"}
              </button>
              <button
                type="button"
                className="w-full text-sm text-slate-600 underline"
                onClick={() => setMode("arrive")}
              >
                Back to sign in
              </button>
            </form>
          ) : null}

          {preview && preview.status !== "expired" && !user && mode === "arrive" ? (
            <form onSubmit={(event) => void handleArrive(event)} className="space-y-4">
              {needsAccount ? (
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  className="block w-full rounded-md border border-slate-300 px-4 py-3"
                />
              ) : null}
              <input
                type="email"
                value={preview.email}
                readOnly
                aria-label="Email"
                className="block w-full rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
                minLength={6}
                autoComplete={needsAccount ? "new-password" : "current-password"}
                className="block w-full rounded-md border border-slate-300 px-4 py-3"
              />
              {message ? <p className="text-sm text-center text-red-700">{message}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-slate-900 py-3 text-white disabled:opacity-50"
              >
                {busy
                  ? "Arriving…"
                  : needsAccount
                    ? "Create account and arrive home"
                    : "Sign in and arrive home"}
              </button>
              {!needsAccount ? (
                <button
                  type="button"
                  className="w-full text-sm text-slate-600 underline"
                  onClick={() => {
                    setMessage(null)
                    setMode("forgot")
                  }}
                >
                  Forgot password?
                </button>
              ) : null}
            </form>
          ) : null}

          {preview && user && emailsMatch(user.email, preview.email) ? (
            <p className="text-sm text-slate-600">{message || `Entering ${preview.domainName}…`}</p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
