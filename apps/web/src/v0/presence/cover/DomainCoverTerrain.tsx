"use client"

import type { RelatedItem } from "../presenceEnrichment"
import {
  judgeDomainCoverTerrain,
  type DomainCoverTerrainProminence,
  type DomainCoverTerrainSection,
} from "./domainCoverTerrain"

export interface DomainCoverTerrainProps {
  sections: Parameters<typeof judgeDomainCoverTerrain>[0]
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

function prominenceStyles(prominence: DomainCoverTerrainProminence): {
  rail: string
  paper: string
  ink: string
  secondary: string
} {
  if (prominence === "settled") {
    return {
      rail: "transparent",
      paper: "var(--treatment-paper, hsl(var(--theme-surface-elevated) / 0.18))",
      ink: "hsl(var(--theme-ink-secondary))",
      secondary: "hsl(var(--theme-ink-tertiary))",
    }
  }
  return {
    rail: "var(--treatment-accent, hsl(var(--theme-border-strong)))",
    paper: "var(--treatment-paper, hsl(var(--theme-surface-elevated) / 0.35))",
    ink: "var(--treatment-ink, hsl(var(--theme-ink-primary)))",
    secondary: "hsl(var(--theme-ink-secondary))",
  }
}

function TerrainReach({
  item,
  prominence,
  onEnter,
}: {
  item: RelatedItem
  prominence: DomainCoverTerrainProminence
  onEnter?: () => void
}) {
  const styles = prominenceStyles(prominence)
  const kindLabel = item.navigateKind === "moment" ? "moment" : "journey"

  return (
    <button
      type="button"
      onClick={onEnter}
      disabled={!onEnter}
      aria-label={`Enter ${kindLabel} ${item.label}`}
      className="w-full text-left rounded-lg px-3 py-2.5 mb-2 transition-opacity hover:opacity-85 disabled:cursor-default disabled:opacity-80"
      style={{
        background: styles.paper,
        boxShadow: styles.rail === "transparent" ? undefined : `inset 3px 0 0 ${styles.rail}`,
        cursor: onEnter ? "pointer" : "default",
      }}
    >
      <span
        className="block text-[13px] font-medium leading-snug"
        style={{ color: styles.ink }}
      >
        {item.label}
      </span>
      {item.preview ? (
        <span
          className="block text-[12px] leading-relaxed mt-0.5 line-clamp-2"
          style={{ color: styles.secondary }}
        >
          {item.preview}
        </span>
      ) : null}
      {item.sub ? (
        <span
          className="block text-[11px] mt-0.5"
          style={{ color: styles.secondary }}
        >
          {item.sub}
        </span>
      ) : null}
    </button>
  )
}

function TerrainBand({
  section,
  onJourneySelect,
  onMomentSelect,
}: {
  section: DomainCoverTerrainSection
  onJourneySelect?: (id: string) => void
  onMomentSelect?: (id: string) => void
}) {
  return (
    <section className="mb-4" data-cover-terrain={section.title}>
      <p
        className="text-[11px] font-semibold uppercase tracking-widest mb-2"
        style={{
          color:
            section.prominence === "settled"
              ? "hsl(var(--theme-ink-tertiary))"
              : "var(--treatment-accent, hsl(var(--theme-ink-tertiary)))",
        }}
      >
        {section.title}
      </p>
      {section.items.map((item) => (
        <TerrainReach
          key={item.id}
          item={item}
          prominence={section.prominence}
          onEnter={terrainReach(item, { onJourneySelect, onMomentSelect })}
        />
      ))}
    </section>
  )
}

/**
 * Domain Cover terrain — judged reaches under Place.
 * Uses existing Chronicle journey/moment selection. Not a dashboard.
 */
export function DomainCoverTerrain({
  sections,
  onJourneySelect,
  onMomentSelect,
}: DomainCoverTerrainProps) {
  const terrain = judgeDomainCoverTerrain(sections)
  if (terrain.length === 0) return null

  return (
    <div className="mt-6" data-cover-terrain-map="domain">
      {terrain.map((section) => (
        <TerrainBand
          key={section.title}
          section={section}
          onJourneySelect={onJourneySelect}
          onMomentSelect={onMomentSelect}
        />
      ))}
    </div>
  )
}
