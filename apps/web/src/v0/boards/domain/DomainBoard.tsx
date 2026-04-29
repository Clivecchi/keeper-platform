"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import { loadDomainFrame } from "../../data/loadDomainFrame"
import { useV0Shell } from "../../shell/V0ShellContext"
import { FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"

import { BOARD_FRAMES, type FrameItem } from "../designer/DesignBoardFrameList"
import type { DesignerMessage } from "../designer/DesignBoard"
import { apiFetch } from "../../../lib/api"
import { KeeperDialogFrame } from "../../components/dialog/KeeperDialogFrame"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { KeeperTopBar } from "../../components/KeeperTopBar"
import { DomainSwitcher } from "../../components/DomainSwitcher"
import { DomainBriefSlideOver } from "../../components/DomainBriefSlideOver"
import { DomainBanner } from "../../components/DomainBanner"
import { FeedFrame } from "../../frames/feed/FeedFrame"
import type { KeptRow } from "../../frames/feed/FeedFrame"
import { MomentDetailPanel } from "../../frames/moment/MomentDetailPanel"
import { KeeperJourneyPanel } from "../../components/panels/KeeperJourneyPanel"
import { StyleScope } from "../../styles/StyleScope"
import { getApiBase } from "../../../lib/apiFetch"
import { getBlobProxyUrl } from "../../../lib/blobProxy"

const JOURNEY_BEGIN_ID = "journey-begin-again-default"

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: { background: "#f0ece4", color: "#57534e", borderColor: "#d6d3d1" },
  primary: { background: "#ecfdf5", color: "#047857", borderColor: "#6ee7b7" },
  panel: { background: "#e0e7ff", color: "#1d4ed8", borderColor: "#a5b4fc" },
}

const BANNER_BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: {
    background: "rgba(255,255,255,0.12)",
    color: "#f9fafb",
    borderColor: "rgba(255,255,255,0.35)",
  },
  primary: {
    background: "rgba(16,185,129,0.28)",
    color: "#ecfdf5",
    borderColor: "rgba(110,231,183,0.45)",
  },
  panel: {
    background: "rgba(59,130,246,0.28)",
    color: "#eff6ff",
    borderColor: "rgba(147,197,253,0.45)",
  },
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function themeBackgroundImageUrl(theme: DomainFrameJson["theme"] | undefined): string | null {
  const raw = theme?.background?.trim()
  if (!raw) return null
  if (
    raw.startsWith("linear-gradient")
    || raw.startsWith("#")
    || raw.startsWith("rgb")
    || raw.startsWith("hsl")
  ) {
    return null
  }
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("/")) {
    return raw
  }
  if (/\.(png|jpe?g|gif|webp|svg)(\?|[#]|$)/i.test(raw)) {
    return raw.startsWith("/") ? raw : `/${raw}`
  }
  return null
}

function extractFrameTitleFromBlock(frameBlock: unknown): string | null {
  if (!frameBlock || typeof frameBlock !== "object") return null
  const obj = frameBlock as Record<string, unknown>
  const labels = obj.labels as Record<string, unknown> | undefined
  const raw = obj.frame_title ?? labels?.frame_title ?? labels?.frameTitle
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

function abbrevFrameLabel(name: string): string {
  const shortened = name.replace(/\s+Frame$/i, "").trim()
  const s = shortened.length > 0 ? shortened : name
  return s.length > 14 ? `${s.slice(0, 12)}…` : s
}

function MessageBubble({ msg }: { msg: DesignerMessage }) {
  const isUser = msg.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
        style={{
          background: isUser ? "#1c1917" : "#f0ece4",
          color: isUser ? "#faf8f5" : "#292524",
          border: isUser ? "none" : "1px solid #e7e5e4",
        }}
      >
        {!isUser && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#78716c" }}>
            Kip
          </p>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
      </div>
    </div>
  )
}

type BoardNavId = "domain" | "design" | "agent"

const DOMAIN_FRAMES: FrameItem[] = BOARD_FRAMES.domain ?? [
  { key: "cover", name: "Board Cover", dotColor: "#7F77DD", badge: "default" },
  { key: "feed", name: "Feed", dotColor: "#1D9E75", badge: "primary" },
  { key: "journeys", name: "Journeys", dotColor: "#378ADD", badge: "panel" },
  { key: "keepers", name: "Keepers", dotColor: "#BA7517", badge: "panel" },
  { key: "moments", name: "Moments", dotColor: "#D4537E", badge: "panel" },
]

export function DomainBoard() {
  const { domainSlug: slug, domainFrame: shellDomainFrame, styleId, themeSlug, domainData } = useV0Shell()
  const domainSlug = slug ?? ""
  const navigate = useNavigate()

  const [liveDomainFrame, setLiveDomainFrame] = React.useState<DomainFrameJson | null>(shellDomainFrame)
  const [leftCollapsed, setLeftCollapsed] = React.useState(false)
  const [activeBoardNav, setActiveBoardNav] = React.useState<BoardNavId>("domain")
  const [selectedFrameKey, setSelectedFrameKey] = React.useState<string | null>(null)
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [journeyCount, setJourneyCount] = React.useState<number | null>(null)
  const [messages, setMessages] = React.useState<DesignerMessage[]>([])
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const [momentCount, setMomentCount] = React.useState<number | null>(null)
  const [switcherOpen, setSwitcherOpen] = React.useState(false)
  const [briefOpen, setBriefOpen] = React.useState(false)
  const [selectedMoment, setSelectedMoment] = React.useState<KeptRow | null>(null)
  const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)
  // Feed Mode = The Commons (default on load). Dialog Mode = The Workshop (after first message).
  const [centerMode, setCenterMode] = React.useState<'feed' | 'dialog'>('feed')

  React.useEffect(() => {
    if (shellDomainFrame) setLiveDomainFrame(shellDomainFrame)
  }, [shellDomainFrame])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    loadDomainFrame(domainSlug)
      .then((frame) => {
        if (!ignore) setLiveDomainFrame(frame)
      })
      .catch(console.error)
    return () => {
      ignore = true
    }
  }, [domainSlug])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: { id?: string }) => {
        if (!ignore && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [domainSlug])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: unknown[] }) => {
        if (!ignore) setJourneyCount(Array.isArray(json?.journeys) ? json.journeys.length : 0)
      })
      .catch(() => {
        if (!ignore) setJourneyCount(null)
      })
    return () => {
      ignore = true
    }
  }, [domainSlug])

  React.useEffect(() => {
    if (!domainSlug) return
    let ignore = false
    apiFetch(
      `/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=500`,
    )
      .then((json: { data?: unknown[] }) => {
        if (!ignore) {
          const n = Array.isArray(json?.data) ? json.data.length : 0
          setMomentCount(n >= 500 ? 500 : n)
        }
      })
      .catch(() => {
        if (!ignore) setMomentCount(null)
      })
    return () => {
      ignore = true
    }
  }, [domainSlug])

  // Auto-resolve first Journey when the "Journeys" frame is selected in the left nav.
  // Clears when a different frame is chosen.
  React.useEffect(() => {
    if (selectedFrameKey !== "journeys" || !domainSlug) {
      setActiveJourneyId(null)
      return
    }
    let cancelled = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: Array<{ id: string }> }) => {
        const first = json.journeys?.[0]
        if (!cancelled && first) setActiveJourneyId(first.id)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [selectedFrameKey, domainSlug])

  // Fetch a moment by ID and switch the right panel to Moment view.
  // Called when a Moment row is tapped inside KeeperJourneyPanel.
  const handleMomentSelectFromJourney = React.useCallback(
    async (momentId: string) => {
      try {
        const json = (await apiFetch(
          `/api/moments/${encodeURIComponent(momentId)}`,
        )) as {
          moment?: {
            id: string
            title: string
            narrative: string
            keptAt?: string | null
            createdAt: string | Date
            Journey?: { name?: string | null }
          }
        }
        const m = json.moment
        if (m) {
          setSelectedMoment({
            id: m.id,
            title: m.title,
            body: m.narrative,
            keptAt: m.keptAt != null ? String(m.keptAt) : null,
            createdAt: String(m.createdAt),
            journeyName: m.Journey?.name ?? null,
          })
          setActiveJourneyId(null)
        }
      } catch {
        // silent
      }
    },
    [],
  )

  const wordmark = liveDomainFrame?.theme?.wordmark?.trim() || domainSlug
  const coverTagline = (() => {
    const card = liveDomainFrame?.cover?.card as { tagLine?: string } | undefined
    return card?.tagLine?.trim() || liveDomainFrame?.theme?.tagline?.trim() || ""
  })()

  const frames = DOMAIN_FRAMES
  const activeFrameRow = selectedFrameKey ? frames.find((f) => f.key === selectedFrameKey) ?? null : null
  const jsonKeyForActive = selectedFrameKey ? FRAME_TO_JSON_KEY[selectedFrameKey] ?? null : null
  const frameBlockForActive =
    jsonKeyForActive && liveDomainFrame
      ? (liveDomainFrame as unknown as Record<string, unknown>)[jsonKeyForActive]
      : null
  const frameContextLine =
    (activeFrameRow && extractFrameTitleFromBlock(frameBlockForActive)) ?? activeFrameRow?.name ?? ""

  const bannerBgUrl = themeBackgroundImageUrl(liveDomainFrame?.theme)

  const coverImageUrl = domainData?.theme?.coverImage ?? null
  const coverImageMode = domainData?.theme?.coverImageMode ?? "cover"
  const displayCoverUrl = coverImageUrl ? getBlobProxyUrl(coverImageUrl) : null
  const pageBackground: React.CSSProperties = displayCoverUrl
    ? {
        backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page) / 0.08), hsl(var(--theme-surface-page) / 0.75)), url(${displayCoverUrl})`,
        backgroundPosition: coverImageMode === "tile" ? "0 0" : "center",
        backgroundSize: coverImageMode === "tile" ? "auto" : "cover",
        backgroundRepeat: coverImageMode === "tile" ? "repeat" : "no-repeat",
      }
    : { backgroundImage: `linear-gradient(180deg, hsl(var(--theme-surface-page)), hsl(var(--theme-surface-paper) / 0.25))` }

  const addMessage = React.useCallback((m: DesignerMessage) => {
    setMessages((prev) => [...prev, m])
  }, [])

  const kipFrameKey = selectedFrameKey ?? "cover"

  const kipInputPlaceholder = "Ask Kip about this domain…"

  const handleSend = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim()
    if (!text || !domainId || isSending) return

    const userMsg: DesignerMessage = { id: uid(), role: "user", content: text }
    addMessage(userMsg)
    setInput("")
    setIsSending(true)
    setSendError(null)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const result = (await apiFetch(`/api/domains/${domainId}/kip/designer`, {
        method: "POST",
        body: JSON.stringify({
          message: text,
          frameKey: kipFrameKey,
          conversationHistory: history,
          dialog_board: "domain",
        }),
      })) as { response: string }

      addMessage({
        id: uid(),
        role: "kip",
        content: result.response ?? "(no response)",
      })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send message"
      setSendError(message)
      addMessage({
        id: uid(),
        role: "kip",
        content: "Sorry, something went wrong. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  // Synthetic timestamps stable per message id — DesignerMessage has no createdAt
  const syntheticTimestamps = React.useRef<Record<string, string>>({})
  const adaptedMessages: AgentDialogueMessage[] = React.useMemo(
    () =>
      messages.map((m) => {
        if (!syntheticTimestamps.current[m.id]) {
          syntheticTimestamps.current[m.id] = new Date().toISOString()
        }
        return {
          id: m.id,
          role: (m.role === "kip" ? "agent" : "user") as "user" | "agent",
          content: m.content,
          createdAt: syntheticTimestamps.current[m.id]!,
        }
      }),
    [messages],
  )

  const handleDialogSubmit = React.useCallback(
    (_e: React.FormEvent, options: { content: string }) => {
      // Sending a message is the moment of intention — switch to Dialog Mode (The Workshop)
      if (centerMode === 'feed') setCenterMode('dialog')
      void handleSend(options.content)
    },
    // handleSend is not memoized; include the deps it closes over
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerMode, domainId, isSending, messages, kipFrameKey],
  )

  const goPresentJourney = () => {
    if (!domainSlug) return
    navigate(`/d/${encodeURIComponent(domainSlug)}?frame=present&journeyId=${encodeURIComponent(JOURNEY_BEGIN_ID)}`)
  }

  const navigateBoard = (id: BoardNavId) => {
    setActiveBoardNav(id)
    if (!domainSlug) return
    if (id === "domain") {
      navigate(`/d/${encodeURIComponent(domainSlug)}?board=domain`)
    } else if (id === "design") {
      navigate(`/d/${encodeURIComponent(domainSlug)}?board=designer`)
    } else {
      navigate(`/d/${encodeURIComponent(domainSlug)}?board=agent`)
    }
  }


  const MOCK_DOMAINS = [
    { slug: "default", name: "KE3P", tagline: "cynically designed, wonderfully unfolded", coverImageUrl: null },
    { slug: "frogmore", name: "Frogmore Juke Joint", tagline: "housefrogmore.com", coverImageUrl: null },
  ]

  return (
    <StyleScope styleId={styleId} themeSlug={themeSlug ?? null}>
    <div
      className="keeper-board-scope relative flex flex-col h-screen w-full overflow-hidden"
      style={pageBackground}
    >
      <KeeperTopBar
        onDomainClick={() => setSwitcherOpen(true)}
        onBriefClick={() => setBriefOpen((o) => !o)}
        isBriefOpen={briefOpen}
      />
      {briefOpen && liveDomainFrame && (
        <DomainBriefSlideOver
          domainFrame={liveDomainFrame}
          onClose={() => setBriefOpen(false)}
        />
      )}
      {switcherOpen && (
        <DomainSwitcher
          domains={MOCK_DOMAINS}
          currentSlug={domainSlug || "default"}
          onSelect={(slug) => navigate(`/d/${encodeURIComponent(slug)}/board`)}
          onAddDomain={() => console.log("Add domain")}
          onClose={() => setSwitcherOpen(false)}
        />
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden px-6 pb-8 gap-[10px]">
        {/* Left */}
        <div
          className="flex flex-col min-h-0 transition-all duration-200 overflow-hidden"
          style={{
            width: leftCollapsed ? 36 : 220,
            minWidth: leftCollapsed ? 36 : 220,
            background: "hsl(var(--theme-surface-panel) / 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "8px",
            border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
            overflowY: "auto",
          }}
        >
          {leftCollapsed ? (
            <div className="flex flex-col items-center pt-3" style={{ width: 36, minWidth: 36 }}>
              <button
                type="button"
                onClick={() => setLeftCollapsed(false)}
                className="p-1.5 rounded-md transition-colors hover:bg-gray-100"
                aria-label="Expand board list"
              >
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                  <path
                    d="M4 2L8 6L4 10"
                    stroke="#6b7280"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div
                className="px-4 py-3 border-b flex items-center justify-between"
                style={{ borderColor: "#e7e5e4" }}
              >
                <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#57534e" }}>
                  Boards
                </p>
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 rounded-md transition-colors hover:bg-gray-100"
                  aria-label="Collapse board list"
                >
                  <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
                    <path
                      d="M8 2L4 6L8 10"
                      stroke="#6b7280"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              <ul className="px-2 pt-2">
                {(
                  [
                    { id: "domain" as const, name: "Domain Board" },
                    { id: "design" as const, name: "Design Board" },
                    { id: "agent" as const, name: "Agent Board" },
                  ] as const
                ).map(({ id, name }) => {
                  const isActive = activeBoardNav === id
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => navigateBoard(id)}
                        className="w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors"
                        style={{ background: isActive ? "#f0ece4" : "transparent" }}
                      >
                        <span
                          className="text-[13px] leading-snug truncate"
                          style={{
                            color: isActive ? "#1c1917" : "#44403c",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {name}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "#78716c" }}>
                  Frames
                </p>
              </div>
              <ul className="px-2 flex-1 pb-2">
                {frames.map((frame) => {
                  const isActive = frame.key === selectedFrameKey
                  return (
                    <li key={frame.key}>
                      <button
                        type="button"
                        onClick={() => setSelectedFrameKey(frame.key)}
                        className="w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors"
                        style={{
                          background: isActive ? "#f0ece4" : "transparent",
                          borderLeft: isActive ? "2px solid #1c1917" : "2px solid transparent",
                        }}
                      >
                        <span
                          className="shrink-0 rounded-full"
                          style={{ width: 8, height: 8, background: frame.dotColor }}
                        />
                        <span
                          className="flex-1 text-[13px] leading-snug truncate"
                          style={{
                            color: isActive ? "#1c1917" : "#44403c",
                            fontWeight: isActive ? 500 : 400,
                          }}
                        >
                          {frame.name.replace(/ Frame$/, "")}
                        </span>
                        <span
                          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                          style={BADGE_STYLES[frame.badge] ?? BADGE_STYLES.default}
                        >
                          {frame.badge}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Center — transparent so Board atmosphere shows through */}
        <div
          className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden"
          style={{ background: "transparent", borderRadius: "8px" }}
        >
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <StyleScope
              styleId={styleId}
              themeSlug={themeSlug ?? null}
              className="flex flex-1 flex-col min-h-0 overflow-hidden"
            >
            <DomainBanner
              domainFrame={liveDomainFrame}
              fallbackWordmark={domainSlug || "—"}
              journeyCount={journeyCount}
              momentCount={momentCount}
            />
            {/*
              Domain Board center panel — two modes:
              Feed Mode  (centerMode='feed')   — The Commons. FeedFrame in Zone 2. No Banner.
              Dialog Mode (centerMode='dialog') — The Workshop. Kip conversation in Zone 2. Banner with ← Commons.
            */}
            <KeeperDialogFrame
              mode={centerMode}
              keeperName={wordmark || undefined}
              showServiceBar={false}
              messages={adaptedMessages}
              isSending={isSending}
              error={sendError}
              agentName="Kip"
              agentBubbleFullWidth={false}
              agentId={null}
              domainId={domainId}
              dialogueMode="domain"
              inputValue={input}
              onInputChange={setInput}
              onSubmit={handleDialogSubmit}
              activeSessionId={domainId}
              disabled={!domainId || isSending}
              onReturnToFeed={() => setCenterMode('feed')}
              feedContent={
                domainSlug
                  ? <FeedFrame onMomentSelect={setSelectedMoment} />
                  : <div className="flex items-center justify-center h-full text-sm text-stone-500">No domain loaded</div>
              }
            />
          </StyleScope>
          </div>
        </div>

        {/* Right */}
        <div
          className="shrink-0 flex flex-col min-h-0 overflow-hidden"
          style={{
            width: 380,
            background: "hsl(var(--theme-surface-panel) / 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderRadius: "8px",
            border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
          }}
        >
          {activeJourneyId ? (
            /* Journey view state — KeeperJourneyPanel owns the full panel including its header */
            <KeeperJourneyPanel
              journeyId={activeJourneyId}
              domainId={domainId}
              onMomentSelect={handleMomentSelectFromJourney}
              onPathSelect={() => {}}
            />
          ) : (
            /* Moment view state or default Domain metadata */
            <>
              <div
                className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e7e5e4]"
              >
                <span className="text-[13px] font-semibold" style={{ color: "#1c1917" }}>
                  {selectedMoment ? "Moment" : "Domain"}
                </span>
                <div className="flex items-center gap-1">
                  {selectedMoment && (
                    <button
                      type="button"
                      aria-label="Close moment"
                      onClick={() => setSelectedMoment(null)}
                      className="p-1.5 rounded-md transition-colors hover:bg-gray-100 text-[#57534e]"
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                        <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="View state"
                    disabled
                    className="p-1.5 rounded-md opacity-50 cursor-not-allowed text-[#57534e]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </button>
                </div>
              </div>
              {selectedMoment ? (
                <MomentDetailPanel moment={selectedMoment} />
              ) : (
                <div className="px-4 py-4 space-y-4 text-[13px] overflow-y-auto" style={{ color: "#44403c" }}>
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#78716c" }}>
                      Name
                    </p>
                    <p className="font-medium" style={{ color: "#1c1917" }}>
                      {wordmark}
                    </p>
                    <p className="text-[12px] mt-1 font-mono" style={{ color: "#57534e" }}>
                      {domainSlug}
                    </p>
                  </div>
                  {coverTagline ? (
                    <div>
                      <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#78716c" }}>
                        Tagline
                      </p>
                      <p>{coverTagline}</p>
                    </div>
                  ) : null}
                  <div>
                    <p className="text-[11px] uppercase tracking-widest font-semibold mb-1" style={{ color: "#78716c" }}>
                      Journeys
                    </p>
                    <p>{journeyCount === null ? "—" : `${journeyCount} Journeys`}</p>
                  </div>
                  <button
                    type="button"
                    onClick={goPresentJourney}
                    className="w-full rounded-lg px-3 py-3 text-[13px] font-medium transition-opacity"
                    style={{ background: "#1c1917", color: "#faf8f5" }}
                  >
                    Begin the Journey
                  </button>
                  <div className="border-t border-[#e7e5e4] pt-4">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-[12px] font-medium" style={{ color: "#047857" }}>
                        Kip is ready
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    </StyleScope>
  )
}
