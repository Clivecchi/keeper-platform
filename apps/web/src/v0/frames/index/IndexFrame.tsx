"use client"

import * as React from "react"
import { X } from "lucide-react"
import type { StyleId } from "../../styles/styles"
import { StyleScope } from "../../styles/StyleScope"
import { ThemeSwitcher } from "../ThemeSwitcher"
import { useV0Shell, type V0FrameKey } from "../../shell/V0ShellContext"
import { useAuth } from "../../../context/AuthContext"
import { apiFetch } from "../../../lib/api"

export type IndexIntent = "human" | "mixed" | "platform"

export interface IndexEntry {
  id: string
  label: string
  description: string
  frame: V0FrameKey
  status?: string
}

export interface IndexSection {
  id: string
  title: string
  intent: IndexIntent
  entries: IndexEntry[]
}

const INDEX_INTENT_TOKENS: Record<IndexIntent, { accent: string; marker: string }> = {
  human: {
    accent: "#8B5E52",
    marker: "#C07A6A",
  },
  mixed: {
    accent: "#5B6B63",
    marker: "#7D8C82",
  },
  platform: {
    accent: "#2E5A8A",
    marker: "#3C6FA5",
  },
}

const INDEX_SURFACE = {
  background: "#EDF2F7",
  gridLine: "rgba(46, 90, 138, 0.08)",
  card: "rgba(255, 255, 255, 0.78)",
}

const FRAME_PADDING = "clamp(1.75rem, 5vw, 3.5rem)"

export function IndexFrame({ styleId = "neutral", themeSlug }: { styleId?: StyleId; themeSlug?: string | null }) {
  const { domainSlug, navigateToFrame, closeToBoard } = useV0Shell()
  const { isAuthenticated, user } = useAuth()
  const [isDomainAdmin, setIsDomainAdmin] = React.useState(false)

  React.useEffect(() => {
    let active = true
    if (!isAuthenticated) {
      setIsDomainAdmin(false)
      return () => {
        active = false
      }
    }

    const resolveAdminStatus = async () => {
      try {
        // TODO: Verify and describe assumptions about domain admin inference from /api/domains/my.
        const response = await apiFetch("/api/domains/my")
        const domains = Array.isArray(response) ? response : response?.domains
        const domain = Array.isArray(domains) ? domains.find((item: any) => item?.slug === domainSlug) : null
        const ownerMatch = Boolean(domain?.ownerId && user?.id && domain.ownerId === user.id)
        const roleValue = String(domain?.role || domain?.permissions?.[0]?.role || "").toLowerCase()
        const adminMatch = roleValue === "admin" || roleValue === "owner"
        if (active) {
          setIsDomainAdmin(Boolean(ownerMatch || adminMatch))
        }
      } catch (error) {
        if (active) {
          setIsDomainAdmin(false)
        }
        console.warn("[IndexFrame] Unable to resolve domain admin status", error)
      }
    }

    resolveAdminStatus()

    return () => {
      active = false
    }
  }, [domainSlug, isAuthenticated, user?.id])

  const sections = React.useMemo<IndexSection[]>(() => {
    const baseSections: IndexSection[] = [
      {
        id: "stories-memory",
        title: "Stories & Memory",
        intent: "human",
        entries: [
          {
            id: "write-moment",
            label: "Write a Moment",
            description: "Capture a new memory or reflection.",
            frame: "moment",
          },
          {
            id: "journeys",
            label: "Journeys",
            description: "Follow connected stories and paths.",
            frame: "journeys",
          },
          {
            id: "keepers",
            label: "Keepers",
            description: "Browse memory vessels and collections.",
            frame: "keepers",
          },
          {
            id: "moments",
            label: "Moments",
            description: "Review your kept moments.",
            frame: "moments",
          },
        ],
      },
      {
        id: "agents-assistance",
        title: "Agents & Assistance",
        intent: "mixed",
        entries: [
          {
            id: "kip",
            label: "Kip",
            description: "Open the Keeper agent for guidance.",
            frame: "agent",
          },
        ],
      },
      {
        id: "activity",
        title: "Activity",
        intent: "mixed",
        entries: [
          {
            id: "feed",
            label: "Feed",
            description: "Scan recent activity across the domain.",
            frame: "feed",
            status: "Experimental",
          },
        ],
      },
      {
        id: "system",
        title: "System",
        intent: "platform",
        entries: [
          {
            id: "diagnostics",
            label: "Diagnostics",
            description: "Review system health and build info.",
            frame: "diagnostics",
          },
        ],
      },
    ]

    if (isDomainAdmin) {
      const systemSection = baseSections.find((section) => section.id === "system")
      systemSection?.entries.push({
        id: "admin",
        label: "Domain Admin",
        description: "Manage domain configuration and controls.",
        frame: "admin",
      })
    }

    return baseSections
  }, [isDomainAdmin])

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug}>
      <main
        className="min-h-screen text-foreground"
        style={{
          backgroundColor: INDEX_SURFACE.background,
          backgroundImage: `linear-gradient(${INDEX_SURFACE.gridLine} 1px, transparent 1px), linear-gradient(90deg, ${INDEX_SURFACE.gridLine} 1px, transparent 1px)`,
          backgroundSize: "28px 28px",
          color: "var(--theme-ink-primary)",
        }}
      >
        <div className="mx-auto w-full max-w-5xl" style={{ padding: FRAME_PADDING }}>
          <header className="flex flex-wrap items-start justify-between gap-6 mb-8">
            <div className="space-y-3 max-w-xl">
              <p className="text-[11px] uppercase tracking-[0.28em]" style={{ color: "var(--theme-ink-tertiary)" }}>
                Domain Index
              </p>
              <h1 className="text-3xl md:text-4xl font-serif" style={{ color: "var(--theme-ink-primary)" }}>
                Table of Contents
              </h1>
              <p className="text-sm leading-snug" style={{ color: "var(--theme-ink-secondary)" }}>
                A structured map of {domainSlug} — designed for quick reference and gentle orientation.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <button
                type="button"
                aria-label="Close index"
                onClick={closeToBoard}
                className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/70 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
              >
                <X className="w-4 h-4" strokeWidth={1.25} />
              </button>
            </div>
          </header>

          <div className="grid gap-5 md:grid-cols-2">
            {sections.map((section) => {
              const intentTokens = INDEX_INTENT_TOKENS[section.intent]
              return (
                <section
                  key={section.id}
                  className="rounded-2xl border px-5 py-4 shadow-sm"
                  style={{
                    borderColor: "rgba(37, 61, 94, 0.16)",
                    backgroundColor: INDEX_SURFACE.card,
                    boxShadow: "0 18px 32px rgba(15, 32, 54, 0.06)",
                  }}
                  aria-label={section.title}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      aria-hidden
                      className="inline-flex h-2 w-2 rounded-full"
                      style={{ backgroundColor: intentTokens.marker }}
                    />
                    <h2 className="text-xs uppercase tracking-[0.22em]" style={{ color: intentTokens.accent }}>
                      {section.title}
                    </h2>
                  </div>
                  <div className="space-y-2">
                    {section.entries.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => navigateToFrame(entry.frame)}
                        className="group w-full rounded-xl border px-4 py-3 text-left transition-colors"
                        style={{
                          borderColor: "rgba(37, 61, 94, 0.14)",
                          backgroundColor: "rgba(255, 255, 255, 0.72)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: "var(--theme-ink-primary)" }}>
                                {entry.label}
                              </span>
                              {entry.status && (
                                <span
                                  className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]"
                                  style={{
                                    borderColor: intentTokens.accent,
                                    color: intentTokens.accent,
                                    backgroundColor: "rgba(255, 255, 255, 0.7)",
                                  }}
                                >
                                  {entry.status}
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-snug" style={{ color: "var(--theme-ink-secondary)" }}>
                              {entry.description}
                            </p>
                          </div>
                          <span className="text-sm opacity-60 transition-transform group-hover:translate-x-0.5">→</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </main>
    </StyleScope>
  )
}
