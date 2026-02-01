"use client"

import * as React from "react"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useAuth } from "../../../context/AuthContext"
import { apiFetch } from "../../../lib/api"
import { EngagementButton } from "../../../components/engagement/EngagementButton"
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
  actionLabel?: string
  onAction?: () => void
}

type FeedItem = {
  title: string
  detail: string
  time: string
}

type DomainSummary = {
  id: string
  name: string
  slug: string
}

type JourneySummary = {
  id: string
  name: string
  forward?: string | null
  momentCount?: number
  pathCount?: number
}

type KeeperSummary = {
  id: string
  title: string
  purpose?: string | null
}

type MomentSummary = {
  id: string
  title?: string | null
  narrative?: string | null
  content?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

const emptyFeed: FeedItem[] = [
  {
    title: "No moments yet",
    detail: "New moments will appear here as the commons grows.",
    time: "Just now"
  }
]

function formatRelativeTime(value?: string | null) {
  if (!value) return "Recently"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"
  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  if (diffMinutes < 2) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

export function CommonsFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug, experienceActions, navigateToFrame } = useV0Shell()
  const { isAdmin } = useAuth()
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [feedItems, setFeedItems] = React.useState<FeedItem[]>(emptyFeed)
  const [anchorCards, setAnchorCards] = React.useState<CommonsCard[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!domainSlug) return
    let active = true

    async function loadCommonsData() {
      setIsLoading(true)
      setLoadError(null)

      try {
        const domain = (await apiFetch(`/api/domains/by-slug/${domainSlug}`)) as DomainSummary
        if (!active) return

        const domainId = domain.id
        setDomainId(domainId)

        const [journeysResponse, keepersResponse, momentsResponse, membersResponse] = await Promise.all([
          apiFetch(`/api/journeys?domainId=${domainId}`).catch(() => null),
          apiFetch(`/api/keepers?domainId=${domainId}`).catch(() => null),
          apiFetch(`/api/moments?domainId=${domainId}&limit=5`).catch(() => null),
          isAdmin ? apiFetch(`/api/domains/${domainId}/members`).catch(() => null) : Promise.resolve(null),
        ])

        if (!active) return

        const journeys = (journeysResponse as any)?.data?.journeys ?? (journeysResponse as any)?.journeys ?? []
        const keepers = (keepersResponse as any)?.data?.keepers ?? (keepersResponse as any)?.keepers ?? []
        const moments = (momentsResponse as any)?.moments ?? (momentsResponse as any)?.data?.moments ?? []
        const members = (membersResponse as any)?.members ?? []

        const journeyItems = (journeys as JourneySummary[]).slice(0, 2).map((journey) => {
          const count = journey.momentCount ?? 0
          return `${journey.name} · ${count} moments`
        })

        const keeperItems = (keepers as KeeperSummary[]).slice(0, 2).map((keeper) => keeper.title)

        const relationshipsItems = [
          `Members: ${members.length || "Private"}`,
          `Keepers: ${(keepers as KeeperSummary[]).length || 0}`,
          `Journeys: ${(journeys as JourneySummary[]).length || 0}`
        ]

        setAnchorCards([
          {
            title: "Journeys",
            description: "Active paths and suggested threads to follow.",
            items: journeyItems.length ? journeyItems : ["No journeys yet", "Start a new journey to begin"],
            actionLabel: "Open journeys",
            onAction: () => navigateToFrame("journeys")
          },
          {
            title: "Relationships",
            description: "People, keepers, and trusted circles nearby.",
            items: relationshipsItems,
            actionLabel: "View profile",
            onAction: () => navigateToFrame("profile")
          },
          {
            title: "Keepers",
            description: "Spaces that hold memory for the domain.",
            items: keeperItems.length ? keeperItems : ["No keepers yet", "Create a keeper to organize memory"],
            actionLabel: "Open keepers",
            onAction: () => navigateToFrame("keepers")
          }
        ])

        const nextFeedItems = (moments as MomentSummary[]).map((moment) => ({
          title: moment.title || "Moment captured",
          detail: moment.narrative || moment.content || "A new moment has been captured.",
          time: formatRelativeTime(moment.updatedAt || moment.createdAt || null)
        }))

        setFeedItems(nextFeedItems.length ? nextFeedItems : emptyFeed)
      } catch (error) {
        console.error("Failed to load commons data:", error)
        if (!active) return
        setLoadError("Unable to load commons data.")
        setFeedItems(emptyFeed)
        setAnchorCards([
          {
            title: "Journeys",
            description: "Active paths and suggested threads to follow.",
            items: ["Journeys are unavailable right now."],
            actionLabel: "Open journeys",
            onAction: () => navigateToFrame("journeys")
          },
          {
            title: "Relationships",
            description: "People, keepers, and trusted circles nearby.",
            items: ["Relationships are unavailable right now."],
            actionLabel: "View profile",
            onAction: () => navigateToFrame("profile")
          },
          {
            title: "Keepers",
            description: "Spaces that hold memory for the domain.",
            items: ["Keepers are unavailable right now."],
            actionLabel: "Open keepers",
            onAction: () => navigateToFrame("keepers")
          }
        ])
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadCommonsData()
    return () => {
      active = false
    }
  }, [domainSlug, isAdmin, navigateToFrame])

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
      {card.onAction && (
        <button
          type="button"
          onClick={card.onAction}
          className="mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
          style={{
            borderColor: COMMONS_SURFACE.border,
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
            color: COMMONS_SURFACE.inkPrimary,
          }}
        >
          {card.actionLabel ?? "Open"}
        </button>
      )}
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
            {isLoading && (
              <div className="rounded-2xl border px-6 py-5 shadow-sm" style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}>
                <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                  Loading commons activity...
                </p>
              </div>
            )}
            {!isLoading && loadError && (
              <div className="rounded-2xl border px-6 py-5 shadow-sm" style={{ backgroundColor: COMMONS_SURFACE.card, borderColor: COMMONS_SURFACE.border }}>
                <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                  {loadError}
                </p>
              </div>
            )}
            {!isLoading &&
              !loadError &&
              feedItems.map((item) => (
                <div
                  key={`${item.title}-${item.time}`}
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
          {anchorCards.map((card) => (
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
                Launch a new journey or capture a moment for the commons.
              </p>
            </div>
            {domainId ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <EngagementButton
                  templateSlug="journey.create"
                  context={{ entityType: "domain", entityId: domainId, domainId }}
                  label="Start journey"
                  variant="secondary"
                />
                <EngagementButton
                  templateSlug="moment.create"
                  context={{ entityType: "domain", entityId: domainId, domainId }}
                  label="Capture moment"
                  variant="secondary"
                />
              </div>
            ) : (
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
            )}
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
