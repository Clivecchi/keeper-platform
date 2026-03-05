"use client"

import { useLocation, useNavigate } from "react-router-dom"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useAgentComposerContext } from "../shell/AgentComposerContext"
import { useKipChatDrawer, KipChatDrawer } from "./KipChatDrawer"
import { AgentComposer } from "../../components/agent/AgentComposer"
import type { DomainFrameJson } from "../data/domain-frame.types"
import type { AudienceRole } from "../data/domain-frame.types"

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

/**
 * InteractionBar buttons — rendered entirely from the domain JSON interaction_bar
 * object and the resolved audience role. No label, order, or visibility rule is
 * hardcoded in this component.
 *
 * Button order: primary (Forward) · secondary (Kip) · auth (Sign In for guest)
 */
function ActionButtons({
  domainFrame,
  audience,
  onForward,
  onKip,
  onSignIn,
  isAgentFrame,
}: {
  domainFrame: DomainFrameJson | null
  audience: AudienceRole
  onForward: () => void
  onKip: () => void
  onSignIn: () => void
  isAgentFrame: boolean
}) {
  const forwardLabel = domainFrame?.forward.label ?? "Forward"
  const authButtonIds = domainFrame?.interaction_bar.auth[audience] ?? []
  const showSignIn = authButtonIds.includes("sign_in")

  return (
    <div className="flex items-center justify-center gap-2">

      {/* Primary: Forward — label from JSON forward.label */}
      <button
        type="button"
        onClick={onForward}
        className="rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: "hsl(var(--theme-surface-paper) / 0.65)",
          color: "var(--theme-ink-primary)",
        }}
        aria-label={`${forwardLabel} — enter the domain`}
      >
        {forwardLabel}
      </button>

      {/* Secondary: Kip — from interaction_bar.secondary */}
      <button
        type="button"
        onClick={onKip}
        className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
        style={{
          borderColor: "var(--theme-border-soft)",
          backgroundColor: isAgentFrame
            ? "hsl(var(--theme-surface-paper) / 0.9)"
            : "hsl(var(--theme-surface-paper) / 0.7)",
          color: "var(--theme-ink-primary)",
          boxShadow: isAgentFrame ? "0 0 0 1px rgba(60, 111, 165, 0.25)" : undefined,
        }}
        aria-label={audience === "guest" ? "Open Kip (public)" : "Open Kip"}
      >
        <span
          className="inline-flex h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: "#3C6FA5" }}
          aria-hidden
        />
        Kip
      </button>

      {/* Auth: Sign In — visible to guest only, from interaction_bar.auth.guest */}
      {showSignIn && (
        <button
          type="button"
          onClick={onSignIn}
          className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: "var(--theme-border-soft)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
            color: "var(--theme-ink-primary)",
          }}
          aria-label="Sign in to your account"
        >
          Sign In
        </button>
      )}
    </div>
  )
}

export function Margin() {
  const v0Shell = useV0ShellOptional()
  const navigate = useNavigate()
  const location = useLocation()
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

  // Read from JSON frame context — no hardcoded values below this line
  const domainFrame = v0Shell.domainFrame
  const audience = v0Shell.resolvedAudience ?? "guest"

  const handleForward = () => {
    const params = buildPreservedParams(searchParams)
    params.set("coverState", "open")
    if (hasFrame) {
      params.set("frame", "cover")
      navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
      return
    }
    navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
  }

  const handleKip = () => {
    if (isAgentFrame) {
      kipChat?.toggle()
    } else {
      const params = buildPreservedParams(searchParams)
      params.set("frame", "agent")
      navigate(`/d/${v0Shell.domainSlug}/board?${params.toString()}`)
      kipChat?.open()
    }
  }

  const handleSignIn = () => {
    const params = buildPreservedParams(searchParams)
    params.set("frame", "agent")
    const nextPath = `/d/${v0Shell.domainSlug}/board?${params.toString()}`
    navigate(`/login?next=${encodeURIComponent(nextPath)}`)
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
              <div className="w-full flex-1 min-w-0">
                <AgentComposer {...composerProps} />
              </div>
              <ActionButtons
                domainFrame={domainFrame}
                audience={audience}
                onForward={handleForward}
                onKip={handleKip}
                onSignIn={handleSignIn}
                isAgentFrame={isAgentFrame}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center">
              <ActionButtons
                domainFrame={domainFrame}
                audience={audience}
                onForward={handleForward}
                onKip={handleKip}
                onSignIn={handleSignIn}
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
