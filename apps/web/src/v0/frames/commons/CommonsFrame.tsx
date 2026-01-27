"use client"

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell } from "../../shell/V0ShellContext"

const COMMONS_SURFACE = {
  card: "hsl(var(--theme-surface-paper) / 0.82)",
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
}

type CommonsCard = {
  title: string
  description: string
  items: string[]
}

const FEED_CARD: CommonsCard = {
  title: "Domain Feed",
  description: "Recent moments and updates across the domain.",
  items: [
    "Morning reflection logged · 2 hours ago",
    "New memory shared with Journeys · Yesterday",
    "Domain update: quiet week of writing",
  ],
}

const JOURNEYS_CARD: CommonsCard = {
  title: "Journeys",
  description: "Active paths and suggested threads to follow.",
  items: [
    "Active: Family archive · 6 open moments",
    "Suggested: Winter rituals and rituals log",
    "Suggested: Keeper notes to revisit",
  ],
}

const RELATIONSHIPS_CARD: CommonsCard = {
  title: "Relationships",
  description: "Domain-scoped people, keepers, and agents.",
  items: [
    "Keepers: 3 active · 2 archived",
    "People: 14 contacts with recent activity",
    "Agents: Kip available for guidance",
  ],
}

export function CommonsFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug, navigateToFrame } = useV0Shell()

  const renderCard = (card: CommonsCard) => (
    <div
      className="rounded-2xl border px-5 py-4 shadow-sm"
      style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
          {card.title}
        </h3>
        <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
          {card.description}
        </p>
      </div>
      <ul className="mt-4 space-y-2 text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
        {card.items.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--theme-line-hairline)" }} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Commons"
      subtitle={`A shared place for ${domainSlug || "this domain"}.`}
      themeSwitcherSlot={<ThemeSwitcher />}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {renderCard(FEED_CARD)}
          {renderCard(JOURNEYS_CARD)}
          {renderCard(RELATIONSHIPS_CARD)}
        </div>

        <div className="space-y-6">
          <div
            className="rounded-2xl border px-5 py-5 shadow-sm"
            style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}
          >
            <div className="space-y-2">
              <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                Kip, present guide
              </h3>
              <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                Kip stays nearby to answer questions and open a deeper session when needed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigateToFrame("kip")}
              className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: COMMONS_SURFACE.border,
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                color: COMMONS_SURFACE.inkPrimary,
              }}
            >
              Open Kip
            </button>
          </div>

          <div
            className="rounded-2xl border px-5 py-5 shadow-sm"
            style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}
          >
            <div className="space-y-2">
              <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                Action Frame
              </h3>
              <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                Awaiting the first meaningful action. Kip will activate this space when needed.
              </p>
            </div>
            <button
              type="button"
              disabled
              className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium opacity-60"
              style={{
                borderColor: COMMONS_SURFACE.border,
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
                color: COMMONS_SURFACE.inkSecondary,
              }}
            >
              Action pending
            </button>
          </div>
        </div>
      </div>
    </DesignFrame>
  )
}
