"use client"

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useAuth } from "../../../context/AuthContext"
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

type FeedItem = {
  title: string
  detail: string
  time: string
}

const FEED_ITEMS: FeedItem[] = [
  {
    title: "Morning reflection logged",
    detail: "A quiet note about the shift from winter to early spring.",
    time: "2 hours ago"
  },
  {
    title: "Memory shared to Journeys",
    detail: "Added a new moment to the Family Archive thread.",
    time: "Yesterday"
  },
  {
    title: "Domain update",
    detail: "Three new keepers added to Relationships.",
    time: "3 days ago"
  }
]

const ANCHOR_CARDS: CommonsCard[] = [
  {
    title: "Journeys",
    description: "Active paths and suggested threads to follow.",
    items: [
      "Active: Family archive · 6 open moments",
      "Suggested: Winter rituals and rituals log",
      "Suggested: Keeper notes to revisit"
    ]
  },
  {
    title: "Relationships",
    description: "People, keepers, and trusted circles nearby.",
    items: [
      "Keepers: 3 active · 2 archived",
      "People: 14 contacts with recent activity",
      "Recent: 2 new introductions this week"
    ]
  },
  {
    title: "Keepers",
    description: "Spaces that hold memory for the domain.",
    items: [
      "Primary: Home archive",
      "Secondary: Rituals and travel",
      "New: 1 keeper awaiting its first moment"
    ]
  }
]

export function CommonsFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug, experienceActions } = useV0Shell()
  const { isAdmin } = useAuth()

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
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section aria-label="Domain feed" className="space-y-5">
          <div
            className="rounded-2xl border px-6 py-5 shadow-sm"
            style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}
          >
            <div className="space-y-1">
              <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                Domain Feed
              </p>
              <h2 className="text-lg font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                Moments and updates
              </h2>
              <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                A living stream of what is changing across the commons.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            {FEED_ITEMS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border px-6 py-5 shadow-sm"
                style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                      {item.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                      {item.detail}
                    </p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.2em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                    {item.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside aria-label="Commons anchors" className="space-y-5">
          {ANCHOR_CARDS.map((card) => (
            <div key={card.title}>{renderCard(card)}</div>
          ))}

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
              onClick={experienceActions.openKip}
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

          {isAdmin && (
            <div
              className="rounded-2xl border px-5 py-5 shadow-sm"
              style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                  Admin tools
                </h3>
                <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                  Quiet access to domain management and policy.
                </p>
              </div>
              <button
                type="button"
                onClick={experienceActions.goAdmin}
                className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
                style={{
                  borderColor: COMMONS_SURFACE.border,
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
                  color: COMMONS_SURFACE.inkPrimary,
                }}
              >
                Open admin
              </button>
            </div>
          )}
        </aside>
      </div>
    </DesignFrame>
  )
}
