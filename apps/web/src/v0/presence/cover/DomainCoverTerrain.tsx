"use client"

import { ArrowRightIcon } from "@heroicons/react/24/outline"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import type { RelatedItem } from "../presenceEnrichment"
import {
  DOMAIN_COVER_ROLE_LABEL,
  judgeDomainCoverPath,
  type DomainCoverReach,
  type DomainCoverRole,
} from "./domainCoverTerrain"

export interface DomainCoverTerrainProps {
  sections: Parameters<typeof judgeDomainCoverPath>[0]
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}

function terrainReach(
  item: RelatedItem,
  handlers: Pick<DomainCoverTerrainProps, "onJourneySelect" | "onMomentSelect">,
): (() => void) | undefined {
  if (item.navigateKind === "journey" && handlers.onJourneySelect) {
    return () => handlers.onJourneySelect?.(item.id)
  }
  if (item.navigateKind === "moment" && handlers.onMomentSelect) {
    return () => handlers.onMomentSelect?.(item.id)
  }
  return undefined
}

function kindLine(item: RelatedItem): string {
  if (item.navigateKind === "moment") return "Moment"
  if (item.navigateKind === "journey") return "Journey"
  if (item.navigateKind === "path") return "Path"
  return "Reach"
}

function metaLine(item: RelatedItem, role: DomainCoverRole): string {
  if (item.sub?.trim()) return item.sub.trim()
  if (role === "needsYou") return `${kindLine(item)} · direction unresolved`
  if (role === "present") return `${kindLine(item)} · available`
  if (role === "becoming") return `${kindLine(item)} · taking form`
  return kindLine(item)
}

function TerrainMark({
  reach,
}: {
  reach: DomainCoverReach
}) {
  const imageUrl = reach.item.imageUrl?.trim()
  if (imageUrl) {
    return (
      <span
        className="shrink-0 self-start mt-1 h-11 w-11 overflow-hidden rounded-lg"
        style={{
          background: "var(--treatment-paper, hsl(var(--theme-surface-elevated)))",
          boxShadow: "inset 0 0 0 1px hsl(var(--theme-border-soft) / 0.35)",
        }}
        aria-hidden
      >
        <img
          src={getBlobProxyUrl(imageUrl)}
          alt=""
          className="h-full w-full object-cover"
        />
      </span>
    )
  }

  if (reach.role !== "now") return null

  return (
    <span
      className="shrink-0 self-start mt-1 h-11 w-11 rounded-lg"
      style={{
        background:
          "linear-gradient(145deg, var(--treatment-accent, hsl(var(--theme-accent-primary))) 0%, var(--treatment-paper, hsl(var(--theme-surface-elevated))) 78%)",
        boxShadow: "inset 0 0 0 1px hsl(var(--theme-border-soft) / 0.28)",
        opacity: 0.88,
      }}
      aria-hidden
    />
  )
}

function TerrainReach({
  reach,
  onEnter,
}: {
  reach: DomainCoverReach
  onEnter?: () => void
}) {
  const isSettled = reach.prominence === "settled"
  const showArrow = Boolean(onEnter) && reach.role !== "needsYou"
  const rail =
    isSettled || reach.role === "needsYou"
      ? "transparent"
      : "var(--treatment-accent, hsl(var(--theme-border-strong)))"

  return (
    <button
      type="button"
      onClick={onEnter}
      disabled={!onEnter}
      aria-label={`${DOMAIN_COVER_ROLE_LABEL[reach.role]}: ${reach.item.label}`}
      className="w-full text-left py-3.5 transition-opacity hover:opacity-90 disabled:cursor-default disabled:opacity-80"
      style={{
        boxShadow: rail === "transparent" ? undefined : `inset 2px 0 0 ${rail}`,
        paddingLeft: rail === "transparent" ? "0.85rem" : "0.95rem",
        cursor: onEnter ? "pointer" : "default",
      }}
    >
      <span className="flex items-start gap-3">
        <span className="min-w-0 flex-1">
          <span
            className="block text-[10px] font-semibold uppercase tracking-[0.16em] mb-1.5"
            style={{
              color: isSettled
                ? "hsl(var(--theme-ink-secondary))"
                : "var(--treatment-accent, hsl(var(--theme-ink-secondary)))",
            }}
          >
            {DOMAIN_COVER_ROLE_LABEL[reach.role]}
          </span>
          <span
            className="block text-[17px] font-medium leading-snug"
            style={{
              color: isSettled
                ? "hsl(var(--theme-ink-secondary))"
                : "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
              fontFamily: "var(--treatment-font-family, inherit)",
            }}
          >
            {reach.item.label}
          </span>
          {reach.item.preview ? (
            <span
              className="block text-[13px] leading-relaxed mt-1.5 line-clamp-2"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {reach.item.preview}
            </span>
          ) : null}
          <span
            className="block text-[11px] mt-1.5"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {metaLine(reach.item, reach.role)}
          </span>
        </span>
        <TerrainMark reach={reach} />
        {showArrow ? (
          <ArrowRightIcon
            className="w-4 h-4 shrink-0 mt-6"
            style={{ color: "var(--treatment-accent, hsl(var(--theme-ink-secondary)))" }}
            aria-hidden
          />
        ) : null}
      </span>
    </button>
  )
}

/**
 * Domain Cover living path — judged reaches under Place.
 * One narrative sequence. Not a dashboard. Not a warehouse.
 */
export function DomainCoverTerrain({
  sections,
  onJourneySelect,
  onMomentSelect,
}: DomainCoverTerrainProps) {
  const path = judgeDomainCoverPath(sections)
  if (path.length === 0) return null

  return (
    <div className="mt-8 px-0.5" data-cover-terrain-map="domain">
      <div className="flex items-baseline justify-between gap-3 mb-2 px-1">
        <p
          className="text-[15px] font-medium"
          style={{
            color: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
            fontFamily: "var(--treatment-font-family, inherit)",
          }}
        >
          What matters here
        </p>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.16em] shrink-0"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Living terrain
        </p>
      </div>

      <div className="divide-y" style={{ borderColor: "hsl(var(--theme-border-soft) / 0.28)" }}>
        {path.map((reach) => (
          <TerrainReach
            key={`${reach.role}-${reach.item.id}`}
            reach={reach}
            onEnter={terrainReach(reach.item, { onJourneySelect, onMomentSelect })}
          />
        ))}
      </div>

      <p
        className="mt-5 px-1 text-[10px] font-medium uppercase tracking-[0.14em] text-center"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        The cover is the map, not the warehouse.
      </p>
    </div>
  )
}
