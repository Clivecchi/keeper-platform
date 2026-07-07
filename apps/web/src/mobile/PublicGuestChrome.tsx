"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { buildRealmShellPath } from "../lib/realmPaths"

export interface PublicGuestChromeProps {
  domainSlug: string
}

export function PublicGuestChrome({ domainSlug }: PublicGuestChromeProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  if (isAuthenticated) return null

  const returnTo = encodeURIComponent(buildRealmShellPath(domainSlug))

  return (
    <div className="public-guest-chrome" aria-label="Guest account actions">
      <button
        type="button"
        className="public-guest-chrome__button"
        onClick={() => navigate(`/login?returnTo=${returnTo}`)}
      >
        Sign In
      </button>
      <button
        type="button"
        className="public-guest-chrome__button public-guest-chrome__button--primary"
        onClick={() => navigate("/register")}
      >
        Get Started
      </button>
    </div>
  )
}
