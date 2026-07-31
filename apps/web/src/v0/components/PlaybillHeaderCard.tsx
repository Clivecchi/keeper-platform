"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { formatPlaybillRoleSubtitle, resolvePlaybillStarName } from "../lib/playbillData"
import { resolveDomainLeadContext, type DomainLeadRecord } from "../lib/domainLeadAgent"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import {
  PlaybillAgentPortrait,
  PlaybillAmbientLayer,
  resolvePlaybillAmbientUrl,
} from "./playbillVisual"

export interface PlaybillHeaderCardProps {
  domainSlug: string
  domainId: string
  domainName: string
  coverImageUrl?: string | null
  domainFrame?: DomainFrameJson | null
  /** DB-enriched lead from GET /api/domains/by-slug — authoritative read path. */
  domainLead?: DomainLeadRecord | null
  leadAgentSlug?: string | null
  leadAgentName?: string | null
  onOpenPlaybill: () => void
  /** Clears board selection — returns Chronicle to Realm idle. Primary header action. */
  onGoHome?: () => void
  isOpen?: boolean
  className?: string
  /**
   * When set on mobile, shows a LIVE pulse on the identity card so Dialog’s
   * domain banner can stay suppressed (one identity bar).
   */
  livePulse?: { color?: string } | boolean
  dialogTitle?: string | null
  dialogUnread?: boolean
  onOpenChronicle?: () => void
}

/**
 * Top-bar Playbill anchor — domain presents its lead agent. Opens the travel dropdown.
 * On ≤767px: single-line domain name + compact portrait (no presents/role stack).
 */
export function PlaybillHeaderCard({
  domainSlug,
  domainId,
  domainName,
  coverImageUrl,
  domainLead,
  leadAgentSlug: leadAgentSlugProp,
  leadAgentName: leadAgentNameProp,
  onOpenPlaybill,
  onGoHome,
  isOpen = false,
  className = "",
  livePulse,
  dialogTitle,
  dialogUnread = false,
  onOpenChronicle,
}: PlaybillHeaderCardProps) {
  const isMobile = useIsMobile()
  const showLive = Boolean(livePulse)
  const liveColor =
    typeof livePulse === "object" && livePulse?.color
      ? livePulse.color
      : undefined
  const leadContext = resolveDomainLeadContext(
    domainLead ?? {
      leadAgentSlug: leadAgentSlugProp,
      leadAgentName: leadAgentNameProp,
    },
  )
  const leadAgentSlug = leadContext.slug

  const { isUncast, isLoading, agent } = usePlaybillCard({
    domainId,
    leadAgentSlug,
    leadAgentName: leadContext.name ?? leadAgentNameProp,
  })

  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring)))"
  const billingName = domainName.trim() || "···"
  const starName = resolvePlaybillStarName({
    domainName: billingName,
    agentDisplayName: agent?.displayName ?? leadContext.name,
    isUncast,
    isLoading,
  })
  const roleSubtitle = formatPlaybillRoleSubtitle(agent, domainSlug, isUncast)

  const portraitUrl = isUncast ? null : agent?.avatarUrl ?? null
  const portraitEmoji = isUncast ? null : agent?.avatarEmoji ?? null
  const ambientUrl = resolvePlaybillAmbientUrl(coverImageUrl, portraitUrl)
  const portraitFallback = isUncast ? "A" : agent?.iconFallback ?? "?"

  const borderStyle = isOpen
    ? "1.5px solid hsl(var(--theme-focus-ring) / 0.75)"
    : "1px solid hsl(var(--theme-border-soft) / 0.45)"

  // Path A — name-only chip; full Playbill (portrait / travel list) stays the light overlay.
  if (isMobile) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPlaybill}
          className={[
            "playbill-header-card playbill-header-card--mobile-chip group relative min-w-0 max-w-full overflow-hidden rounded-full text-left transition-opacity hover:opacity-95",
            className,
          ].join(" ")}
          style={{ border: borderStyle, minHeight: 36, padding: "6px 10px 6px 12px", background: "hsl(var(--theme-surface-panel) / 0.45)" }}
          aria-label={`${billingName} — open domain travel`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span className="relative z-10 flex min-w-0 items-center gap-1.5">
          {showLive ? (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: liveColor ?? "hsl(var(--theme-border-strong))",
                boxShadow: liveColor
                  ? `0 0 0 2px color-mix(in srgb, ${liveColor} 35%, transparent)`
                  : "0 0 0 2px hsl(var(--theme-border-soft) / 0.6)",
              }}
              aria-hidden
            />
          ) : null}
          <span
            className="min-w-0 truncate font-serif text-[14px] font-bold leading-none tracking-tight"
            style={{ color: "hsl(var(--theme-header-text-primary, var(--theme-ink-primary)))" }}
          >
            {billingName}
          </span>
          <ChevronDown
            className={`shrink-0 opacity-55 ${isOpen ? "rotate-180" : ""}`}
            style={{ width: 14, height: 14, color: "hsl(var(--theme-header-text-secondary))" }}
            aria-hidden
          />
          </span>
        </button>
        {dialogTitle && onOpenChronicle ? (
          <button
            type="button"
            onClick={onOpenChronicle}
            className="flex min-w-0 items-center gap-1.5 rounded-full px-2 py-1 text-left"
            style={{ color: "hsl(var(--theme-header-text-primary, var(--theme-ink-primary)))" }}
            aria-label={`Open Chronicle for ${dialogTitle}`}
          >
            <span className="truncate font-serif text-[14px] font-semibold">→ {dialogTitle}</span>
            {dialogUnread ? <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "hsl(var(--theme-accent-primary))" }} aria-label="Chronicle updated" /> : null}
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={[
        "playbill-header-card group relative min-w-0 w-full overflow-hidden rounded-xl text-left transition-opacity",
        className,
      ].join(" ")}
      style={{
        border: borderStyle,
        minHeight: 68,
      }}
    >
      <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} />

      <div className="relative z-10 flex items-stretch gap-3 px-3.5 py-2.5 pr-2">
        <button
          type="button"
          onClick={onGoHome ?? (() => {})}
          className="min-w-0 flex-1 flex flex-col justify-center py-0.5 text-left hover:opacity-95 transition-opacity"
          aria-label={`${billingName} — return to Realm`}
          title="Return to Realm"
        >
          <p
            className="text-[8px] font-semibold uppercase tracking-[0.2em] truncate mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
          >
            {billingName} presents
          </p>

          <h1
            className="font-serif text-[20px] font-bold leading-tight tracking-tight truncate"
            style={{ color: "hsl(var(--theme-header-text-primary, var(--theme-ink-primary)))" }}
          >
            {starName}
          </h1>
          <p
            className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.14em] truncate"
            style={{ color: accent }}
          >
            {roleSubtitle}
          </p>
        </button>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 self-center">
          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            portraitEmoji={portraitEmoji}
            fallback={portraitFallback}
            accent={accent}
            size="header"
          />
          <button
            type="button"
            onClick={onOpenPlaybill}
            className="shrink-0 opacity-50 transition-transform transition-opacity hover:opacity-80"
            aria-label={`${billingName} — open domain travel`}
            aria-haspopup="menu"
            aria-expanded={isOpen}
          >
            <ChevronDown
              className={isOpen ? "rotate-180" : ""}
              style={{ width: 14, height: 14, color: "hsl(var(--theme-header-text-secondary))" }}
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  )
}
