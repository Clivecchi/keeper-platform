"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { formatPlaybillRoleSubtitle, resolvePlaybillStarName } from "../lib/playbillData"
import { resolvePlaybillLeadAgentSlug } from "../lib/frameLeadAgentIdentity"
import { PLAYBILL_ANCHOR_MAX_WIDTH } from "../boards/domain/domainSwitcherTheme"
import type { DomainFrameJson } from "../data/domain-frame.types"
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
  leadAgentSlug?: string | null
  onOpenPlaybill: () => void
  isOpen?: boolean
  className?: string
}

/**
 * Top-bar Playbill — domain offers its agent and relationship state.
 * Click opens The Playbill (domain travel list).
 */
export function PlaybillHeaderCard({
  domainSlug,
  domainId,
  domainName,
  coverImageUrl,
  domainFrame,
  leadAgentSlug: leadAgentSlugProp,
  onOpenPlaybill,
  isOpen = false,
  className = "",
}: PlaybillHeaderCardProps) {
  const leadAgentSlug =
    leadAgentSlugProp ?? resolvePlaybillLeadAgentSlug(domainSlug, domainFrame ?? null)

  const { isUncast, isLoading, agent, activityLine } = usePlaybillCard({
    domainId,
    leadAgentSlug,
  })

  const accent = "hsl(var(--theme-accent-primary, var(--theme-focus-ring)))"
  const billingName = domainName.trim() || domainSlug
  const starName = resolvePlaybillStarName({
    domainName: billingName,
    agentDisplayName: agent?.displayName,
    isUncast,
    isLoading,
  })
  const roleSubtitle = formatPlaybillRoleSubtitle(agent, domainSlug, isUncast)

  const tagline = (() => {
    const card = domainFrame?.cover?.card as { tagLine?: string } | undefined
    return (
      card?.tagLine?.trim() ||
      domainFrame?.theme?.tagline?.trim() ||
      agent?.roleLine ||
      ""
    )
  })()

  const portraitUrl = isUncast ? null : agent?.avatarUrl ?? null
  const ambientUrl = resolvePlaybillAmbientUrl(coverImageUrl, portraitUrl)
  const portraitFallback = isUncast ? "A" : agent?.iconFallback ?? "?"

  return (
    <button
      type="button"
      onClick={onOpenPlaybill}
      className={[
        "playbill-header-card group relative min-w-0 flex-1 overflow-hidden rounded-xl text-left transition-opacity hover:opacity-95",
        className,
      ].join(" ")}
      style={{
        border: isOpen
          ? "1.5px solid hsl(var(--theme-focus-ring) / 0.75)"
          : "1px solid hsl(var(--theme-border-soft) / 0.45)",
        minHeight: 72,
        maxWidth: PLAYBILL_ANCHOR_MAX_WIDTH,
      }}
      aria-label={`${billingName} — open The Playbill`}
      aria-haspopup="dialog"
      aria-expanded={isOpen}
    >
      <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} />

      <div className="relative z-10 flex items-stretch gap-3 px-3.5 py-2.5 pr-2">
        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
          <p
            className="text-[8px] font-semibold uppercase tracking-[0.2em] truncate mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
          >
            {billingName} presents
          </p>

          <div className="flex items-start gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <h1
                className="font-serif text-[20px] font-bold leading-tight tracking-tight truncate"
                style={{ color: "hsl(var(--theme-header-text-primary, var(--theme-ink-primary)))" }}
              >
                {isLoading && !isUncast ? "…" : starName}
              </h1>
              <p
                className="mt-0.5 text-[9px] font-mono uppercase tracking-[0.14em] truncate"
                style={{ color: accent }}
              >
                {roleSubtitle}
              </p>
              {tagline ? (
                <p
                  className="mt-1 text-[11px] italic leading-snug line-clamp-1"
                  style={{ color: "hsl(var(--theme-header-text-secondary, var(--theme-ink-secondary)))" }}
                >
                  {tagline}
                </p>
              ) : null}
              <p
                className="mt-0.5 text-[10px] truncate"
                style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))" }}
                aria-live="polite"
              >
                {isLoading ? "Loading…" : activityLine}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center gap-1.5 self-center">
          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            fallback={portraitFallback}
            accent={accent}
            size="header"
          />
          <ChevronDown
            className="shrink-0 opacity-50 transition-opacity group-hover:opacity-80"
            style={{ width: 14, height: 14, color: "hsl(var(--theme-header-text-secondary))" }}
            aria-hidden
          />
        </div>
      </div>
    </button>
  )
}
