"use client"

import * as React from "react"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
} from "../boards/domain/domainSwitcherTheme"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { useIsMobile } from "../../mobile/hooks/useIsMobile"
import { sealPlaybillGreet } from "../lib/playbillGreetContinuity"
import {
  formatPlaybillRoleSubtitle,
  resolvePlaybillDomainLabel,
  resolvePlaybillStarName,
} from "../lib/playbillData"
import {
  PlaybillAgentPortrait,
  PlaybillAmbientLayer,
  resolvePlaybillAmbientUrl,
} from "./playbillVisual"

export interface PlaybillCardDomain {
  id: string
  slug: string
  name: string
  tagline?: string | null
  coverImageUrl?: string | null
  leadAgentSlug: string | null
  leadAgentName?: string | null
}

export interface PlaybillCardProps {
  domain: PlaybillCardDomain
  isCurrent?: boolean
  onSelect: (slug: string) => void
  onClose?: () => void
  onPrefetch?: (slug: string) => void
  /** Dropdown rows are flat; realm rail keeps ambient treatment. */
  variant?: "overlay" | "realm"
  className?: string
}

/**
 * Playbill travel row — domain presents its lead agent. The whole row is Enter.
 */
export function PlaybillCard({
  domain,
  isCurrent = false,
  onSelect,
  onClose,
  onPrefetch,
  variant = "overlay",
  className = "",
}: PlaybillCardProps) {
  const isMobile = useIsMobile()
  const { isUncast, isLoading, agent } = usePlaybillCard({
    domainId: domain.id,
    leadAgentSlug: domain.leadAgentSlug,
    leadAgentName: domain.leadAgentName,
  })

  const inkPrimary =
    variant === "overlay" ? SWITCHER_INK_PRIMARY : "hsl(var(--theme-ink-primary))"
  const inkMuted =
    variant === "overlay"
      ? SWITCHER_INK_MUTED
      : "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))"

  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring)))"
  const billingName = resolvePlaybillDomainLabel({
    domainName: domain.name,
    domainSlug: domain.slug,
  })
  const starName = resolvePlaybillStarName({
    domainName: domain.name,
    domainSlug: domain.slug,
    agentDisplayName: agent?.displayName ?? domain.leadAgentName,
    isUncast,
    isLoading,
  })
  const roleSubtitle = formatPlaybillRoleSubtitle(agent, domain.slug, isUncast)
  const ariaLead =
    starName === billingName
      ? billingName
      : agent?.displayName ?? domain.leadAgentName ?? billingName

  const portraitUrl = isUncast ? null : agent?.avatarUrl ?? null
  const portraitEmoji = isUncast ? null : agent?.avatarEmoji ?? null
  const ambientUrl = resolvePlaybillAmbientUrl(domain.coverImageUrl, portraitUrl)
  const portraitFallback =
    isUncast || starName === billingName
      ? (billingName.trim().charAt(0) || "?").toUpperCase()
      : agent?.iconFallback ?? "?"

  const handleEnter = () => {
    sealPlaybillGreet(domain.slug, domain.leadAgentSlug)
    onSelect(domain.slug)
    onClose?.()
  }

  if (variant === "overlay") {
    return (
      <button
        type="button"
        onClick={handleEnter}
        onMouseEnter={() => onPrefetch?.(domain.slug)}
        onFocus={() => onPrefetch?.(domain.slug)}
        className={[
          "playbill-dropdown-card group relative w-full overflow-hidden rounded-lg text-left transition-opacity hover:opacity-95",
          isCurrent ? "playbill-dropdown-card--current" : "",
          className,
        ].join(" ")}
        style={{
          border: isCurrent
            ? "1.5px solid hsl(var(--theme-focus-ring) / 0.75)"
            : "1px solid hsl(var(--theme-border-soft) / 0.45)",
        }}
        aria-current={isCurrent ? "true" : undefined}
        aria-label={`Enter ${billingName} with ${ariaLead}`}
      >
        <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} />

        <div
          className={[
            "relative z-10 flex items-center",
            isMobile ? "gap-2 px-2.5 py-1.5" : "gap-2.5 px-3 py-2.5",
          ].join(" ")}
        >
          <div className="min-w-0 flex-1">
            <p className="playbill-dropdown-row__presents break-words [overflow-wrap:anywhere]">
              {billingName} presents
            </p>
            <p
              className={[
                "playbill-dropdown-row__name break-words [overflow-wrap:anywhere] font-serif font-bold leading-tight",
                isMobile ? "text-[14px]" : "text-[15px]",
              ].join(" ")}
              style={{ color: inkPrimary }}
            >
              {starName}
            </p>
            <p
              className="playbill-dropdown-row__role mt-0.5 truncate text-[9px] font-mono uppercase tracking-[0.12em]"
              style={{ color: accent }}
            >
              {roleSubtitle}
            </p>
          </div>

          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            portraitEmoji={portraitEmoji}
            fallback={portraitFallback}
            accent={accent}
            size={isMobile ? "compact" : "card"}
          />
        </div>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleEnter}
      onMouseEnter={() => onPrefetch?.(domain.slug)}
      onFocus={() => onPrefetch?.(domain.slug)}
      className={[
        "playbill-card relative w-full overflow-hidden rounded-xl text-left transition-opacity hover:opacity-95",
        className,
      ].join(" ")}
      style={{
        border: isCurrent
          ? "1.5px solid hsl(var(--theme-focus-ring))"
          : "1px solid hsl(var(--theme-border-soft) / 0.55)",
      }}
      aria-current={isCurrent ? "true" : undefined}
      aria-label={`Enter ${billingName} with ${ariaLead}`}
    >
      <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} />

      <div className="relative z-10 flex items-center gap-2.5 px-3 py-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-[8px] font-semibold uppercase tracking-[0.08em] break-words [overflow-wrap:anywhere]"
            style={{ color: inkMuted }}
          >
            {billingName} presents
          </p>
          <h3
            className="mt-1 font-serif font-bold leading-tight break-words [overflow-wrap:anywhere] text-[16px]"
            style={{ color: inkPrimary }}
          >
            {starName}
          </h3>
          <p
            className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.12em] truncate"
            style={{ color: accent }}
          >
            {roleSubtitle}
          </p>
        </div>

        <PlaybillAgentPortrait
          portraitUrl={portraitUrl}
          portraitEmoji={portraitEmoji}
          fallback={portraitFallback}
          accent={accent}
          size="card"
        />
      </div>
    </button>
  )
}
