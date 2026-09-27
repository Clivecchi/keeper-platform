import React, { useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { apiFetch } from "../lib/api"
import { withNextQuery } from "../lib/invitationReturn"

const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const next = searchParams.get("next") || undefined
  const [email, setEmail] = useState(searchParams.get("email") || "")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setMessage("")
    try {
      const result = (await apiFetch("/api/kam/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email, ...(next ? { next } : {}) }),
      })) as { data?: { message?: string } }
      setMessage(result.data?.message || "If that email has a Keeper account, a reset link is on its way.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a reset link.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold text-slate-900">Reset password</h1>
          <p className="text-slate-600">We will email a link if this address has a Keeper account.</p>
        </div>
        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-200/70 px-8 py-7">
          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              required
              autoComplete="email"
              className="block w-full rounded-md border border-slate-300 px-4 py-3"
            />
            {message ? <p className="text-sm text-slate-700">{message}</p> : null}
            {error ? <p className="text-sm text-center text-red-700">{error}</p> : null}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-md bg-slate-900 py-3 text-white disabled:opacity-50"
            >
              {busy ? "Sending…" : "Email a reset link"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link to={withNextQuery("/login", next)} className="font-medium text-slate-900">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
