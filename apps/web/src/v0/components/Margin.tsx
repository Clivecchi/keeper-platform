"use client"

import { useLocation, useNavigate } from "react-router-dom"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useAgentComposerContext } from "../shell/AgentComposerContext"
import { useKipChatDrawer, KipChatDrawer } from "./KipChatDrawer"
import { useAuth } from "../../context/AuthContext"
import { AgentComposer } from "../../components/agent/AgentComposer"

export const V0_MARGIN_HEIGHT = "72px"
export const V0_MARGIN_HEIGHT_WITH_COMPOSER = "180px"

function buildPreservedParams(search: URLSearchParams) {
  const params = new URLSearchParams()
  const theme = search.get("theme")
  const style = search.get("style")
  if (theme) params.set("theme", theme)
  if (style) params.set("style", style)
  return params
}

function ActionButtons({
  onExplore,
  onKip,
  onKipOld,
  onLogin,
  isAuthenticated,
  isAgentFrame,
}: {
  onExplore: () => void
  onKip: () => void
  onKipOld: () => void
  onLogin: () => void
  isAuthenticated: boolean
  isAgentFrame: boolean
}) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={onExplore}
        className="rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.65)",
          color: "var(--theme-ink-primary)",
        }}
        aria-label="Enter the Act threshold"
      >
        Act
      </button>
      <button
        type="button"
        onClick={onKip}
        className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: isAgentFrame ? "hsl(var(--theme-surface-paper) / 0.9)" : "hsl(var(--theme-surface-paper) / 0.7)",
          color: "var(--theme-ink-primary)",
          boxShadow: isAgentFrame ? "0 0 0 1px rgba(60, 111, 165, 0.25)" : undefined,
        }}
        aria-label={isAuthenticated ? "Open Kip" : "Open Kip (public scope)"}
      >
        <span className="inline-flex h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#3C6FA5" }} aria-hidden />
        Kip
      </button>
      <button
        type="button"
        onClick={onKipOld}
        className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
          color: "var(--theme-ink-primary)",
        }}
        aria-label="Open Kip (legacy)"
      >
        kip - old
      </button>
      {!isAuthenticated && (
        <button
          type="button"
          onClick={onLogin}
          className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: "var(--theme-border-soft)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
            color: "var(--theme-ink-primary)",
          }}
          aria-label="Login to access domain scope"
        >
          Sign in
        </button>
      )}
    </div>
  )
}

export function Margin() {
  const v0Shell = useV0ShellOptional()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const composerProps = useAgentComposerContext()
  const kipChat = useKipChatDrawer()

  if (!v0Shell?.domainSlug) {
    return null
  }

  const searchParams = new URLSearchParams(location.search)
  const hasFrame = searchParams.has("frame")
  const frame = v0Shell.frame
  const isAgentFrame = frame === "agent" || frame === "kip"
  const showComposer = isAgentFrame && composerProps

  const handleNavigateToKip = () => {
    if (isAgentFrame) {
      kipChat?.toggle()
    } else {
      const params = buildPreservedParams(searchParams)
      params.set("frame", "agent")
      navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
      kipChat?.open()
    }
  }

  const handleNavigateToKipOld = () => {
    const params = buildPreservedParams(searchParams)
    params.set("frame", "kip")
    navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
  }

  const handleLogin = () => {
    const params = buildPreservedParams(searchParams)
    params.set("frame", "agent")
    const nextPath = `/d/${v0Shell.domainSlug}/board?${params.toString()}`
    navigate(`/login?next=${encodeURIComponent(nextPath)}`)
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

  const marginHeight = showComposer ? V0_MARGIN_HEIGHT_WITH_COMPOSER : V0_MARGIN_HEIGHT

  return (
    <>
    <div
      className="fixed inset-x-0 bottom-0 z-40"
      style={{
        minHeight: marginHeight,
        borderTop: "1px solid var(--theme-border-soft)",
        backgroundColor: "hsl(var(--theme-surface-page) / 0.7)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div className="mx-auto flex h-full min-h-[72px] w-full max-w-5xl flex-col gap-3 px-6 py-3">
        {showComposer && composerProps ? (
          <>
            {/* Composer full width on top */}
            <div className="w-full flex-1 min-w-0">
              <AgentComposer {...composerProps} />
            </div>
            {/* Act, Kip, kip-old below */}
            <ActionButtons
              onExplore={handleExplore}
              onKip={handleNavigateToKip}
              onKipOld={handleNavigateToKipOld}
              onLogin={handleLogin}
              isAuthenticated={isAuthenticated}
              isAgentFrame={isAgentFrame}
            />
          </>
        ) : (
          <div className="flex flex-1 items-center">
            <ActionButtons
              onExplore={handleExplore}
              onKip={handleNavigateToKip}
              onKipOld={handleNavigateToKipOld}
              onLogin={handleLogin}
              isAuthenticated={isAuthenticated}
              isAgentFrame={isAgentFrame}
            />
          </div>
        )}
      </div>
    </div>
    <KipChatDrawer />
    </>
  )
}
