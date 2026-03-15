"use client"

import * as React from "react"
import { Navigate, useLocation, useParams } from "react-router-dom"

const FRAME_MAP: Record<string, string> = {
  feed: "feed",
  keepers: "keepers",
  journeys: "journeys",
  profile: "profile",
  agent: "agent",
  admin: "admin",
}

const LegacyDomainRedirect: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>()
  const location = useLocation()
  const legacySegment = location.pathname.split("/").filter(Boolean).pop() || "feed"
  const frame = FRAME_MAP[legacySegment] || "feed"
  const search = new URLSearchParams(location.search)
  const theme = search.get("theme")
  const style = search.get("style")

  const nextParams = new URLSearchParams()
  nextParams.set("frame", frame)
  if (theme) nextParams.set("theme", theme)
  if (style) nextParams.set("style", style)

  return <Navigate to={`/d/${slug}?${nextParams.toString()}`} replace />
}

export default LegacyDomainRedirect
