"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { usePlaybillCard } from "../hooks/usePlaybillCard"
import { formatPlaybillRoleSubtitle, resolvePlaybillStarName } from "../lib/playbillData"
import { resolveDomainLeadContext, type DomainLeadRecord } from "../lib/domainLeadAgent"
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
  /** DB-enriched lead from GET /api/domains/by-slug — authoritative read path. */
  domainLead?: DomainLeadRecord | null
  leadAgentSlug?: string | null
  leadAgentName?: string | null
  onOpenPlaybill: () => void
  /** Clears board selection — returns Chronicle to Realm idle. Primary header action. */
  onGoHome?: () => void
  isOpen?: boolean
  className?: string
}

/**
 * Top-bar Playbill anchor — domain presents its lead agent. Opens the travel dropdown.
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
}: PlaybillHeaderCardProps) {
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

  return (
    <div
      className={[
        "playbill-header-card group relative min-w-0 w-full overflow-hidden rounded-xl text-left transition-opacity",
        className,
      ].join(" ")}
      style={{
        border: isOpen
          ? "1.5px solid hsl(var(--theme-focus-ring) / 0.75)"
          : "1px solid hsl(var(--theme-border-soft) / 0.45)",
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
            {isLoading && !isUncast ? "…" : starName}
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
