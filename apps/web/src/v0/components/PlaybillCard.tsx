"use client"

import * as React from "react"
import { DoorOpen } from "lucide-react"
import {
  SWITCHER_INK_MUTED,
  SWITCHER_INK_PRIMARY,
  SWITCHER_INK_SECONDARY,
} from "../boards/domain/domainSwitcherTheme"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { sealPlaybillGreet } from "../lib/playbillGreetContinuity"
import { formatPlaybillRoleSubtitle, resolvePlaybillStarName } from "../lib/playbillData"
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
}

export interface PlaybillCardProps {
  domain: PlaybillCardDomain
  isCurrent?: boolean
  onSelect: (slug: string) => void
  onClose?: () => void
  onPrefetch?: (slug: string) => void
  /** Desktop overlay uses compact ink tokens; mobile uses theme vars. */
  variant?: "overlay" | "realm"
  className?: string
}

/**
 * Playbill travel card — blurred ambient, clear agent portrait, explicit Enter.
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
  const { isUncast, isLoading, agent, activityLine } = usePlaybillCard({
    domainId: domain.id,
    leadAgentSlug: domain.leadAgentSlug,
  })

  const inkPrimary =
    variant === "overlay" ? SWITCHER_INK_PRIMARY : "hsl(var(--theme-ink-primary))"
  const inkSecondary =
    variant === "overlay" ? SWITCHER_INK_SECONDARY : "hsl(var(--theme-ink-secondary))"
  const inkMuted =
    variant === "overlay" ? SWITCHER_INK_MUTED : "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))"

  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring)))"
  const billingName = domain.name.trim() || domain.slug
  const starName = resolvePlaybillStarName({
    domainName: billingName,
    agentDisplayName: agent?.displayName,
    isUncast,
    isLoading,
  })
  const roleSubtitle = formatPlaybillRoleSubtitle(agent, domain.slug, isUncast)
  const ariaLead = isUncast ? "Agent" : agent?.displayName ?? "lead agent"
  const voiceLine = domain.tagline?.trim() || agent?.roleLine || ""

  const portraitUrl = isUncast ? null : agent?.avatarUrl ?? null
  const ambientUrl = resolvePlaybillAmbientUrl(domain.coverImageUrl, portraitUrl)
  const portraitFallback = isUncast ? "A" : agent?.iconFallback ?? "?"

  const handleEnter = () => {
    sealPlaybillGreet(domain.slug, domain.leadAgentSlug)
    onSelect(domain.slug)
    onClose?.()
  }

  return (
    <article
      className={[
        "playbill-card relative w-full overflow-hidden text-left",
        variant === "overlay" ? "rounded-lg" : "rounded-xl",
        className,
      ].join(" ")}
      style={{
        border: isCurrent
          ? "1.5px solid hsl(var(--theme-focus-ring))"
          : "1px solid hsl(var(--theme-border-soft) / 0.55)",
      }}
      onMouseEnter={() => onPrefetch?.(domain.slug)}
      onFocus={() => onPrefetch?.(domain.slug)}
      aria-current={isCurrent ? "true" : undefined}
    >
      <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} />

      <div className="relative z-10">
        <p
          className="px-3 pt-2.5 pb-1 text-[8px] font-semibold uppercase tracking-[0.2em] truncate"
          style={{ color: inkMuted }}
        >
          {billingName} presents
        </p>

        <div className="flex items-start gap-2.5 px-3 pb-2">
          <div className="min-w-0 flex-1 pt-0.5">
            <h3
              className="font-serif font-bold leading-tight truncate text-[16px]"
              style={{ color: inkPrimary }}
            >
              {isLoading && !isUncast ? "…" : starName}
            </h3>
            <p
              className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.12em] truncate"
              style={{ color: accent }}
            >
              {roleSubtitle}
            </p>
            {voiceLine ? (
              <p
                className="mt-1.5 text-[11px] italic leading-snug line-clamp-2"
                style={{ color: inkSecondary }}
              >
                {voiceLine}
              </p>
            ) : null}
            <p
              className="mt-1 text-[10px] leading-snug truncate"
              style={{ color: inkMuted }}
              aria-live="polite"
            >
              {isLoading ? "Loading activity…" : activityLine}
            </p>
          </div>

          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            fallback={portraitFallback}
            accent={accent}
            size="card"
          />
        </div>

        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={handleEnter}
            className="playbill-enter-btn flex w-full items-center justify-center gap-2 rounded-full border px-3 py-2 text-[12px] font-medium transition-opacity hover:opacity-90"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.65)",
              color: inkPrimary,
              background: "hsl(var(--theme-surface-elevated) / 0.55)",
            }}
            aria-label={`Enter ${billingName} with ${ariaLead}`}
          >
            <DoorOpen className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            Enter
          </button>
        </div>

        {isCurrent ? (
          <p
            className="px-3 pb-2 text-[9px] font-medium uppercase tracking-wider text-center"
            style={{ color: "hsl(var(--theme-focus-ring))" }}
          >
            Current domain
          </p>
        ) : null}
      </div>
    </article>
  )
}
