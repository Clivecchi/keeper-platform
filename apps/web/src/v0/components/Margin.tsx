"use client"

import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useAgentComposerContext } from "../shell/AgentComposerContext"
import { useKipChatDrawer, KipChatDrawer } from "./KipChatDrawer"
import { AgentComposer } from "../../components/agent/AgentComposer"
import { CompanionSlide } from "../slides/CompanionSlide"
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

/** Subtle scroll-up chevron decoration resting just above the bottom bar */
function ScrollUpHint() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 flex justify-center"
      style={{ top: "-18px" }}
      aria-hidden
    >
      <div
        className="flex flex-col items-center gap-0.5 opacity-30"
        style={{ color: "var(--theme-ink-muted, var(--theme-ink-primary))" }}
      >
        {/* Two stacked chevrons give a subtle "scroll up" feel */}
        <svg
          width="14"
          height="8"
          viewBox="0 0 14 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ opacity: 0.5 }}
        >
          <path
            d="M1 7L7 1L13 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          width="14"
          height="8"
          viewBox="0 0 14 8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ marginTop: "-3px" }}
        >
          <path
            d="M1 7L7 1L13 7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  )
}

/**
 * BottomBarLeft — Forward button, left-justified
 */
function BottomBarLeft({
  domainFrame,
  onForward,
}: {
  domainFrame: DomainFrameJson | null
  onForward: () => void
}) {
  const forwardLabel = domainFrame?.forward.label ?? "Forward"

  return (
    <div className="flex items-center">
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
    </div>
  )
}

/**
 * BottomBarRight — Sign In then Kip, right-justified
 */
function BottomBarRight({
  domainFrame,
  audience,
  onKip,
  onSignIn,
  isAgentFrame,
}: {
  domainFrame: DomainFrameJson | null
  audience: AudienceRole
  onKip: () => void
  onSignIn: () => void
  isAgentFrame: boolean
}) {
  const authButtonIds = domainFrame?.interaction_bar.auth[audience] ?? []
  const showSignIn = authButtonIds.includes("sign_in")

  return (
    <div className="flex items-center gap-2">
      {/* Auth: Sign In — visible to guest only */}
      {showSignIn && (
        <button
          type="button"
          onClick={onSignIn}
          className="rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
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

      {/* Secondary: Kip — furthest right */}
      <button
        type="button"
        onClick={onKip}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-90"
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
    </div>
  )
}

export function Margin() {
  const v0Shell = useV0ShellOptional()
  const navigate = useNavigate()
  const location = useLocation()
  const composerProps = useAgentComposerContext()
  const kipChat = useKipChatDrawer()
  const [isCompanionOpen, setIsCompanionOpen] = React.useState(false)

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
    if (audience === "guest") {
      // Guests get the Companion SlideType — not the Agent Studio
      setIsCompanionOpen(true)
      return
    }
    // Authenticated keepers and admins use the existing agent frame + drawer
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

  const companionGreeting = domainFrame?.kip.greeting ?? "Hello. What would you like to keep today?"
  const companionAgentId = domainFrame?.kip.agent_id ?? "kip"

  // experienceContext — Spec Step 6: pass the resolved domain frame context into Kip's environment.
  // Computed here from domainFrame + resolvedAudience so the API can inject it into the system prompt.
  const experienceContext: Record<string, unknown> | undefined = domainFrame
    ? {
        audience,
        model: domainFrame.kip.model,
        forward: domainFrame.forward,
        directions: domainFrame.directions.filter((d) => d.available_to.includes(audience)),
        kip_context: domainFrame.kip_context[audience] ?? "",
      }
    : undefined

  return (
    <>
      {/* Companion SlideType — renders for guests instead of the Agent Studio */}
      <CompanionSlide
        isOpen={isCompanionOpen}
        onClose={() => setIsCompanionOpen(false)}
        greeting={companionGreeting}
        audience={audience}
        domainSlug={v0Shell.domainSlug}
        agentId={companionAgentId}
        experienceContext={experienceContext}
        onSignIn={() => {
          setIsCompanionOpen(false)
          handleSignIn()
        }}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-40"
        style={{
          minHeight: marginHeight,
          borderTop: "1px solid var(--theme-border-soft)",
          backgroundColor: "hsl(var(--theme-surface-page) / 0.7)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Scroll-up hint decoration sits just above the bar border */}
        <ScrollUpHint />

        <div className="mx-auto flex h-full min-h-[72px] w-full max-w-5xl flex-col gap-3 px-6 py-3">
          {showComposer && composerProps ? (
            <>
              <div className="w-full flex-1 min-w-0">
                <AgentComposer {...composerProps} />
              </div>
              <div className="flex items-center justify-between">
                <BottomBarLeft domainFrame={domainFrame} onForward={handleForward} />
                <BottomBarRight
                  domainFrame={domainFrame}
                  audience={audience}
                  onKip={handleKip}
                  onSignIn={handleSignIn}
                  isAgentFrame={isAgentFrame}
                />
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-between">
              <BottomBarLeft domainFrame={domainFrame} onForward={handleForward} />
              <BottomBarRight
                domainFrame={domainFrame}
                audience={audience}
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
