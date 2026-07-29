"use client"

import * as React from "react"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { formatPlaybillRoleSubtitle, resolvePlaybillStarName } from "../lib/playbillData"
import { resolveDomainLeadContext, type DomainLeadRecord } from "../lib/domainLeadAgent"
import type { DomainFrameJson } from "../data/domain-frame.types"
import {
  PlaybillAgentPortrait,
  PlaybillAmbientLayer,
  resolvePlaybillAmbientUrl,
} from "./playbillVisual"

export interface LocationStripProps {
  domainSlug: string
  domainId: string
  domainName: string
  coverImageUrl?: string | null
  domainFrame?: DomainFrameJson | null
  leadAgentSlug?: string | null
  leadAgentName?: string | null
  domainLead?: DomainLeadRecord | null
  className?: string
}

/**
 * Read-only location strip — domain presents its lead agent.
 * Travel lives in Chronicle Playbill rail, not a popover.
 */
export function LocationStrip({
  domainSlug,
  domainId,
  domainName,
  coverImageUrl,
  domainFrame,
  leadAgentSlug: leadAgentSlugProp,
  leadAgentName: leadAgentNameProp,
  domainLead,
  className = "",
}: LocationStripProps) {
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
  const billingName = domainName.trim() || domainSlug
  const starName = resolvePlaybillStarName({
    domainName: billingName,
    agentDisplayName: agent?.displayName,
    isUncast,
    isLoading,
  })
  const roleSubtitle = formatPlaybillRoleSubtitle(agent, domainSlug, isUncast)

  const portraitUrl = isUncast ? null : agent?.avatarUrl ?? null
  const portraitEmoji = isUncast ? null : agent?.avatarEmoji ?? null
  const ambientUrl = resolvePlaybillAmbientUrl(coverImageUrl, portraitUrl)
  const portraitFallback = isUncast ? "A" : agent?.iconFallback ?? "?"

  return (
    <div
      className={[
        "location-strip relative min-w-0 flex-1 max-w-[min(520px,58vw)] overflow-hidden rounded-xl",
        className,
      ].join(" ")}
      style={{
        border: "1px solid hsl(var(--theme-border-soft) / 0.45)",
        minHeight: 72,
      }}
      aria-label={`${billingName} presents ${starName}`}
    >
      <PlaybillAmbientLayer imageUrl={ambientUrl} accent={accent} contained />

      <div className="relative z-10 flex items-stretch gap-3 px-3.5 py-2.5">
        <div className="min-w-0 flex-1 flex flex-col justify-center py-0.5">
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
        </div>

        <div className="flex shrink-0 items-center self-center">
          <PlaybillAgentPortrait
            portraitUrl={portraitUrl}
            portraitEmoji={portraitEmoji}
            fallback={portraitFallback}
            accent={accent}
            size="header"
          />
        </div>
      </div>
    </div>
  )
}
