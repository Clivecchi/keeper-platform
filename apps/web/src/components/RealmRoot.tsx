import * as React from "react"
import { useLocation } from "react-router-dom"
import BrandRealmShellPage from "../pages/d/BrandRealmShellPage"
import { usesCleanRealmPaths } from "../lib/realmPaths"

/**
 * `/` entry — brand hosts render the realm shell in place; platform hosts use RootRedirect.
 */
export function RealmRoot({ platformRedirect }: { platformRedirect: React.ReactNode }) {
  const location = useLocation()
  const hostname = typeof window !== "undefined" ? window.location.hostname : ""

  if (usesCleanRealmPaths(hostname) && location.pathname === "/") {
    return <BrandRealmShellPage />
  }

  return <>{platformRedirect}</>
}
