"use client"

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import type { StyleId } from "../../styles/styles"
import { DesignFrame } from "../DesignFrame"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useAuth } from "../../../context/AuthContext"
import { apiFetch } from "../../../lib/api"
import { EngagementButton } from "../../../components/engagement/EngagementButton"
import MediaUploader from "../../../components/studio/MediaUploader"
import { useV0Shell } from "../../shell/V0ShellContext"

const COMMONS_SURFACE = {
  card: "hsl(var(--theme-surface-paper) / 0.82)",
  sideCard: "hsl(var(--theme-surface-paper) / 0.6)",
  border: "var(--theme-border-soft)",
  inkPrimary: "var(--theme-ink-primary)",
  inkSecondary: "var(--theme-ink-secondary)",
}

const COMMONS_EXPERIENCES = ["observe", "focus", "build", "reflect"] as const

export type CommonsExperience = (typeof COMMONS_EXPERIENCES)[number]

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
  description?: string | null
}

type DomainTheme = {
  coverImage?: string | null
  coverImageKey?: string | null
}

type DomainDetails = {
  id: string
  name: string
  slug: string
  description?: string | null
  theme?: DomainTheme | null
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

type CoverMedia = {
  type: "image"
  url: string
  key?: string
}

const emptyFeed: FeedItem[] = [
  {
    title: "No moments yet",
    detail: "New moments will appear here as the commons grows.",
    time: "Just now",
  }
]

function resolveCommonsExperience(value?: string | null): CommonsExperience {
  const normalized = value?.toLowerCase() ?? ""
  if ((COMMONS_EXPERIENCES as readonly string[]).includes(normalized)) {
    return normalized as CommonsExperience
  }
  return "observe"
}

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
  const [searchParams, setSearchParams] = useSearchParams()
  const experience = resolveCommonsExperience(searchParams.get("experience"))
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [domainName, setDomainName] = React.useState<string | null>(null)
  const [domainDescription, setDomainDescription] = React.useState<string | null>(null)
  const [domainTheme, setDomainTheme] = React.useState<DomainTheme | null>(null)
  const [coverMedia, setCoverMedia] = React.useState<CoverMedia | null>(null)
  const [coverSaveStatus, setCoverSaveStatus] = React.useState<"idle" | "saving" | "success" | "error">("idle")
  const [coverSaveError, setCoverSaveError] = React.useState<string | null>(null)
  const [feedItems, setFeedItems] = React.useState<FeedItem[]>(emptyFeed)
  const [moments, setMoments] = React.useState<MomentSummary[]>([])
  const [journeys, setJourneys] = React.useState<JourneySummary[]>([])
  const [keepers, setKeepers] = React.useState<KeeperSummary[]>([])
  const [membersCount, setMembersCount] = React.useState<number | null>(null)
  const [anchorCards, setAnchorCards] = React.useState<CommonsCard[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  const setExperience = React.useCallback((next: CommonsExperience) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set("experience", next)
    setSearchParams(nextParams, { replace: true })
  }, [searchParams, setSearchParams])

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
        setDomainName(domain.name)
        setDomainDescription(domain.description ?? null)

        const [journeysResponse, keepersResponse, momentsResponse, membersResponse, domainDetailResponse] = await Promise.all([
          apiFetch(`/api/journeys?domainId=${domainId}`).catch(() => null),
          apiFetch(`/api/keepers?domainId=${domainId}`).catch(() => null),
          apiFetch(`/api/moments?domainId=${domainId}&limit=5`).catch(() => null),
          isAdmin ? apiFetch(`/api/domains/${domainId}/members`).catch(() => null) : Promise.resolve(null),
          apiFetch(`/api/domains/${domainId}`).catch(() => null),
        ])

        if (!active) return

        const journeys = (journeysResponse as any)?.data?.journeys ?? (journeysResponse as any)?.journeys ?? []
        const keepers = (keepersResponse as any)?.data?.keepers ?? (keepersResponse as any)?.keepers ?? []
        const moments = (momentsResponse as any)?.moments ?? (momentsResponse as any)?.data?.moments ?? []
        const members = (membersResponse as any)?.members ?? []
        const domainDetails = (domainDetailResponse as any)?.domain as DomainDetails | undefined
        const theme = domainDetails?.theme ?? null
        const coverImage = theme?.coverImage ?? null
        const coverImageKey = theme?.coverImageKey ?? null

        setJourneys(journeys as JourneySummary[])
        setKeepers(keepers as KeeperSummary[])
        setMoments(moments as MomentSummary[])
        setMembersCount(typeof members?.length === "number" ? members.length : null)
        setDomainTheme(theme)
        setCoverMedia(coverImage ? { type: "image", url: coverImage, key: coverImageKey ?? undefined } : null)

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
        setJourneys([])
        setKeepers([])
        setMoments([])
        setMembersCount(null)
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
        setDomainTheme(null)
        setCoverMedia(null)
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
      className="rounded-2xl border px-5 py-4"
      style={{ backgroundColor: COMMONS_SURFACE.sideCard, borderColor: COMMONS_SURFACE.border }}
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

  const renderWorkspaceHeader = (eyebrow: string, title: string, description: string) => (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
        {eyebrow}
      </p>
      <h3 className="text-xl font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
        {title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: COMMONS_SURFACE.inkSecondary }}>
        {description}
      </p>
      <div className="h-px w-full" style={{ backgroundColor: COMMONS_SURFACE.border }} />
    </div>
  )

  const focusMoment = moments[0] ?? null

  const renderObserveWorkspace = () => (
    <div className="space-y-6">
      {renderWorkspaceHeader("Observe", "Commons activity", "A continuous view of what is alive in the commons.")}
      <div className="space-y-6">
        {isLoading && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
              Loading commons activity...
            </p>
            <div className="h-px w-full" style={{ backgroundColor: COMMONS_SURFACE.border }} />
          </div>
        )}
        {!isLoading && loadError && (
          <div className="space-y-2">
            <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
              {loadError}
            </p>
            <div className="h-px w-full" style={{ backgroundColor: COMMONS_SURFACE.border }} />
          </div>
        )}
        {!isLoading &&
          !loadError &&
          feedItems.map((item, index) => (
            <div key={`${item.title}-${item.time}`} className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                    {item.title}
                  </h4>
                  <p className="text-sm leading-relaxed" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                    {item.detail}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                  {item.time}
                </span>
              </div>
              {index < feedItems.length - 1 && <div className="h-px w-full" style={{ backgroundColor: COMMONS_SURFACE.border }} />}
            </div>
          ))}
      </div>
    </div>
  )

  const renderFocusWorkspace = () => (
    <div className="space-y-6">
      {renderWorkspaceHeader("Focus", "Centered moment", "Stay with one thread without leaving the commons.")}
      {focusMoment ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-lg font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
              {focusMoment.title || "Untitled moment"}
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: COMMONS_SURFACE.inkSecondary }}>
              {focusMoment.narrative || focusMoment.content || "This moment is still forming."}
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
            {formatRelativeTime(focusMoment.updatedAt || focusMoment.createdAt || null)}
          </div>
          <button
            type="button"
            onClick={() => setExperience("observe")}
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90"
            style={{
              borderColor: COMMONS_SURFACE.border,
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
              color: COMMONS_SURFACE.inkPrimary,
            }}
          >
            Return to observe
          </button>
        </div>
      ) : (
        <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
          There are no moments to focus on yet.
        </p>
      )}
    </div>
  )

  const renderBuildWorkspace = () => (
    <div className="space-y-6">
      {renderWorkspaceHeader("Build", "Make something in commons", "Start a journey or capture a moment without leaving the commons.")}
      {domainId ? (
        <div className="flex flex-wrap gap-3">
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
        <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
          Builder actions are unavailable while the domain is loading.
        </p>
      )}
    </div>
  )

  const renderReflectWorkspace = () => (
    <div className="space-y-6">
      {renderWorkspaceHeader("Reflect", "Commons summary", "A quick synthesis of what the commons is holding.")}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          { label: "Journeys", value: journeys.length },
          { label: "Keepers", value: keepers.length },
          { label: "Moments", value: moments.length },
          { label: "Members", value: membersCount ?? "Private" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border px-4 py-3"
            style={{ backgroundColor: COMMONS_SURFACE.sideCard, borderColor: COMMONS_SURFACE.border }}
          >
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
              {item.label}
            </p>
            <p className="mt-2 text-lg font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderWorkspace = () => {
    switch (experience) {
      case "focus":
        return renderFocusWorkspace()
      case "build":
        return renderBuildWorkspace()
      case "reflect":
        return renderReflectWorkspace()
      case "observe":
      default:
        return renderObserveWorkspace()
    }
  }

  const handleCoverChange = async (nextCover: { type: string; url: string; key?: string } | null) => {
    if (!domainId) return
    if (nextCover && nextCover.type !== "image") {
      setCoverSaveError("Cover images must be PNG, JPG, or WEBP.")
      setCoverSaveStatus("error")
      return
    }

    setCoverSaveStatus("saving")
    setCoverSaveError(null)

    const nextTheme: DomainTheme = {
      ...(domainTheme ?? {}),
      coverImage: nextCover?.url ?? null,
      coverImageKey: nextCover?.key ?? null,
    }

    try {
      await apiFetch(`/api/domains/${domainId}`, {
        method: "PATCH",
        body: JSON.stringify({ theme: nextTheme }),
      })
      if (nextCover) {
        setCoverMedia({ type: "image", url: nextCover.url, key: nextCover.key })
      } else {
        setCoverMedia(null)
      }
      setDomainTheme(nextTheme)
      setCoverSaveStatus("success")
      setTimeout(() => setCoverSaveStatus("idle"), 2000)
    } catch (error) {
      console.error("Failed to save cover image:", error)
      setCoverSaveStatus("error")
      setCoverSaveError("Cover image could not be saved. Please try again.")
    }
  }

  const bannerBackground = coverMedia?.url
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-paper) / 0.1), hsl(var(--theme-surface-paper) / 0.78)), url(${coverMedia.url})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }
    : {
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.75)",
      }

  return (
    <DesignFrame
      styleId={styleId}
      themeSlug={themeSlug}
      title="Commons"
      subtitle={`A shared place for ${domainSlug || "this domain"}.`}
      themeSwitcherSlot={<ThemeSwitcher />}
    >
      <div className="space-y-8">
        <section
          aria-label="Commons banner"
          className="rounded-3xl border px-6 py-6 md:px-8 md:py-8"
          style={{ borderColor: COMMONS_SURFACE.border, ...bannerBackground }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                {domainName || domainSlug || "This domain"}
              </h2>
              <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                KE3P · cryptically designed, wonderfully underfolded
              </p>
            </div>
            {isAdmin && (
              <div
                className="rounded-2xl border px-4 py-4 md:px-5 md:py-5"
                style={{ borderColor: COMMONS_SURFACE.border, backgroundColor: "hsl(var(--theme-surface-paper) / 0.85)" }}
              >
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                    Cover image
                  </p>
                  <p className="text-xs" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                    Upload a background image for the commons banner.
                  </p>
                </div>
                <div className="mt-3">
                  <MediaUploader value={coverMedia} onChange={handleCoverChange} />
                </div>
                {coverSaveStatus === "saving" && (
                  <p className="mt-3 text-xs" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                    Saving cover image...
                  </p>
                )}
                {coverSaveStatus === "success" && (
                  <p className="mt-3 text-xs" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                    Cover image saved.
                  </p>
                )}
                {coverSaveStatus === "error" && coverSaveError && (
                  <p className="mt-3 text-xs text-red-600">
                    {coverSaveError}
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        <div
          className="rounded-3xl border px-4 py-6 md:px-6"
          style={{ borderColor: COMMONS_SURFACE.border, backgroundColor: "hsl(var(--theme-surface-paper) / 0.65)" }}
        >
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)]">
            <aside aria-label="Commons context" className="space-y-5">
            {anchorCards.map((card) => (
              <div key={card.title}>{renderCard(card)}</div>
            ))}

            <div
              className="rounded-2xl border px-5 py-5"
              style={{ backgroundColor: COMMONS_SURFACE.sideCard, borderColor: COMMONS_SURFACE.border }}
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                  Workspace modes
                </h3>
                <p className="text-sm" style={{ color: COMMONS_SURFACE.inkSecondary }}>
                  Shift how the commons workspace is experienced.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {COMMONS_EXPERIENCES.map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setExperience(mode)}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-90"
                    style={{
                      borderColor: COMMONS_SURFACE.border,
                      backgroundColor:
                        experience === mode ? "hsl(var(--theme-surface-paper) / 0.95)" : "hsl(var(--theme-surface-paper) / 0.7)",
                      color: COMMONS_SURFACE.inkPrimary,
                    }}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="rounded-2xl border px-5 py-5"
              style={{ backgroundColor: COMMONS_SURFACE.sideCard, borderColor: COMMONS_SURFACE.border }}
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
              className="rounded-2xl border px-5 py-5"
              style={{ backgroundColor: COMMONS_SURFACE.sideCard, borderColor: COMMONS_SURFACE.border }}
            >
              <div className="space-y-2">
                <h3 className="text-base font-semibold" style={{ color: COMMONS_SURFACE.inkPrimary }}>
                  Ways to contribute
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
                className="rounded-2xl border px-5 py-5"
                style={{ backgroundColor: COMMONS_SURFACE.sideCard, borderColor: COMMONS_SURFACE.border }}
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

            <section aria-label="Commons workspace" className="space-y-6">
              {renderWorkspace()}
            </section>
          </div>
        </div>
      </div>
    </DesignFrame>
  )
}
