import React, { useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { apiFetch } from "../lib/api"
import { safeRelativeNext } from "../lib/invitationReturn"
import { useAuth } from "../context/AuthContext"

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const next = safeRelativeNext(searchParams.get("next"))
  const navigate = useNavigate()
  const { login } = useAuth()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password !== confirm) {
      setError("Those passwords do not match.")
      return
    }
    setBusy(true)
    setError("")
    try {
      const result = (await apiFetch("/api/kam/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })) as {
        success?: boolean
        data?: {
          user?: { id: string; email: string | null; name: string | null; avatar_url: string | null }
          token?: string
        }
      }
      if (!result.success || !result.data?.user) {
        throw new Error("Could not reset the password.")
      }
      login(result.data)
      navigate(next || "/home", { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password.")
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="font-display text-4xl font-semibold text-slate-900">Choose a new password</h1>
          <p className="text-slate-600">This replaces the password on the Keeper account for that email.</p>
        </div>
        <div className="bg-white/90 rounded-2xl shadow-lg border border-slate-200/70 px-8 py-7">
          {!token ? (
            <p className="text-sm text-red-700">This reset link is missing its token. Request a new one.</p>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="New password"
                required
                minLength={6}
                autoComplete="new-password"
                className="block w-full rounded-md border border-slate-300 px-4 py-3"
              />
              <input
                type="password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                placeholder="Confirm password"
                required
                minLength={6}
                autoComplete="new-password"
                className="block w-full rounded-md border border-slate-300 px-4 py-3"
              />
              {error ? <p className="text-sm text-center text-red-700">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-md bg-slate-900 py-3 text-white disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save password and continue"}
              </button>
            </form>
          )}
          <p className="mt-6 text-center text-sm text-slate-600">
            <Link to="/forgot-password" className="font-medium text-slate-900">
              Request a new link
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default ResetPasswordPage
