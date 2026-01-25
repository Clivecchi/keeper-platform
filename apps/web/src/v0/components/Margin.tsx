"use client"

import { useLocation, useNavigate } from "react-router-dom"
import { useV0ShellOptional } from "../shell/V0ShellContext"

export const V0_MARGIN_HEIGHT = "72px"

function buildPreservedParams(search: URLSearchParams) {
  const params = new URLSearchParams()
  const theme = search.get("theme")
  const style = search.get("style")
  if (theme) params.set("theme", theme)
  if (style) params.set("style", style)
  return params
}

export function Margin() {
  const v0Shell = useV0ShellOptional()
  const navigate = useNavigate()
  const location = useLocation()

  if (!v0Shell?.domainSlug) {
    return null
  }

  const searchParams = new URLSearchParams(location.search)
  const hasFrame = searchParams.has("frame")

  const handleNavigateToKip = () => {
    const params = buildPreservedParams(searchParams)
    params.set("frame", "kip")
    navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
  }

  const handleExplore = () => {
    const params = buildPreservedParams(searchParams)
    params.set("coverState", "open")
    if (hasFrame) {
      params.set("frame", "cover")
      navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
      return
    }
    navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        height: V0_MARGIN_HEIGHT,
        borderTop: "1px solid var(--theme-border-soft)",
        backgroundColor: "hsl(var(--theme-surface-page) / 0.7)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-5xl items-center px-6">
        <div className="flex w-full items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExplore}
              className="rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: "var(--theme-border-soft)",
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.65)",
                color: "var(--theme-ink-primary)",
              }}
              aria-label="Explore the domain"
            >
              Explore
            </button>
          </div>
          <div
            className="ml-auto flex items-center gap-2 border-l pl-4"
            style={{ borderColor: "var(--theme-border-soft)" }}
          >
            <button
              type="button"
              onClick={handleNavigateToKip}
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: "var(--theme-border-soft)",
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
                color: "var(--theme-ink-primary)",
                boxShadow: "0 0 0 1px rgba(60, 111, 165, 0.25)",
              }}
              aria-label="Open Kip"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#3C6FA5" }} aria-hidden />
              Kip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
