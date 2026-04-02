"use client"

import * as React from "react"
import { Code2, FileText, LayoutGrid, Layers, MessageCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import { loadDomainFrame } from "../../data/loadDomainFrame"
import { useV0Shell } from "../../shell/V0ShellContext"
import { FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { V0_MARGIN_HEIGHT } from "../../components/Margin"
import { BOARD_FRAMES, type FrameItem } from "../designer/DesignBoardFrameList"
import type { DesignerMessage } from "../designer/DesignBoard"
import { apiFetch } from "../../../lib/api"
import { DomainBoardBanner } from "./DomainBoardBanner"
import { DomainBrief } from "../../components/DomainBrief"
import { DomainBanner } from "../../components/DomainBanner"
import { DomainFeed } from "../../components/DomainFeed"
import { StyleScope } from "../../styles/StyleScope"
import { getApiBase } from "../../../lib/apiFetch"

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

type CenterPanelMode = "feed" | "chat" | "frames" | "brief" | "code"

const DOMAIN_FRAMES: FrameItem[] = BOARD_FRAMES.domain ?? [
  { key: "cover", name: "Board Cover", dotColor: "#7F77DD", badge: "default" },
  { key: "feed", name: "Feed", dotColor: "#1D9E75", badge: "primary" },
  { key: "journeys", name: "Journeys", dotColor: "#378ADD", badge: "panel" },
  { key: "keepers", name: "Keepers", dotColor: "#BA7517", badge: "panel" },
  { key: "moments", name: "Moments", dotColor: "#D4537E", badge: "panel" },
  { key: "relationships", name: "Relationships", dotColor: "#888780", badge: "panel" },
]

export function DomainBoard() {
  const { domainSlug: slug, domainFrame: shellDomainFrame, styleId, themeSlug } = useV0Shell()
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
  const [centerPanelMode, setCenterPanelMode] = React.useState<CenterPanelMode>("feed")
  const [momentCount, setMomentCount] = React.useState<number | null>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

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

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending, selectedFrameKey, centerPanelMode])

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

  const addMessage = React.useCallback((m: DesignerMessage) => {
    setMessages((prev) => [...prev, m])
  }, [])

  const kipFrameKey = centerPanelMode === "chat" ? "cover" : (selectedFrameKey ?? "cover")

  const kipInputPlaceholder =
    centerPanelMode === "chat" ? "Ask Kip about this domain..." : "Ask Kip about this domain…"

  const handleSend = async () => {
    const text = input.trim()
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

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
      navigate(`/d/${encodeURIComponent(domainSlug)}?frame=agent`)
    }
  }

  const chatInputClass =
    "domain-board-chat-input flex-1 rounded-lg border px-3 py-3 min-h-[48px] text-[13px] outline-none transition-colors box-border focus-visible:ring-2 focus-visible:ring-stone-400/50 focus-visible:border-stone-400 resize-y min-h-[52px] max-h-[140px]"

  const renderKipComposer = () => (
    <div
      className="shrink-0 border-t px-3 py-3"
      style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
    >
      {sendError && <p className="mb-2 text-[11px] text-red-600 font-medium">{sendError}</p>}
      <div className="flex items-start gap-2">
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-end mb-2"
          style={{
            background: "#e7e5e4",
            color: "#44403c",
            border: "1px solid #d6d3d1",
          }}
        >
          Kip
        </span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={kipInputPlaceholder}
          disabled={!domainId || isSending}
          rows={2}
          className={chatInputClass}
          style={{
            borderColor: "#d6d3d1",
            background: "#fefdfb",
            color: "#1c1917",
            boxShadow: "0 1px 2px rgba(28,25,23,0.06)",
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!input.trim() || !domainId || isSending}
          className="rounded-lg p-2 transition-opacity disabled:opacity-40 shrink-0 self-end mb-1"
          style={{ background: "#1c1917", color: "#faf8f5" }}
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M2 7h9M8 4l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  )

  return (
    <div
      className="keeper-board-scope flex flex-col h-screen w-full overflow-hidden"
      style={{ background: "#f5f2eb" }}
    >
      <DomainBoardBanner domainSlug={domainSlug} liveDomainFrame={liveDomainFrame} />

      <div
        className="flex flex-1 min-h-0 overflow-hidden"
        style={{ paddingBottom: V0_MARGIN_HEIGHT }}
      >
        {/* Left */}
        <div
          className="flex flex-col border-r border-[#e7e5e4] min-h-0 transition-all duration-200"
          style={{
            width: leftCollapsed ? 36 : 220,
            minWidth: leftCollapsed ? 36 : 220,
            background: "#fdfbf7",
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

        {/* Center */}
        <div
          className="flex flex-col flex-1 min-w-0 min-h-0 border-r border-gray-200 overflow-hidden"
          style={{ background: "#fefdfb" }}
        >
          <div
            className="shrink-0 flex items-center justify-center border-b px-3 py-2 gap-3"
            style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
          >
            <div
              className="flex items-center rounded-md overflow-hidden shrink-0"
              style={{ border: "1px solid #d6d3d1", background: "#faf8f5" }}
              role="tablist"
              aria-label="Primary center modes"
            >
              {(
                [
                  { mode: "feed" as const, Icon: Layers, label: "Domain feed" },
                  { mode: "chat" as const, Icon: MessageCircle, label: "Domain chat with Kip" },
                ] as const
              ).map(({ mode, Icon, label }) => {
                const active = centerPanelMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={label}
                    onClick={() => setCenterPanelMode(mode)}
                    className="flex items-center justify-center transition-colors"
                    style={{
                      width: 36,
                      height: 30,
                      color: active ? "#faf8f5" : "#57534e",
                      background: active ? "#1c1917" : "transparent",
                      border: "none",
                    }}
                  >
                    <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                  </button>
                )
              })}
            </div>
            <div
              className="flex items-center rounded-md overflow-hidden shrink-0"
              style={{ border: "1px solid #d6d3d1", background: "#faf8f5" }}
              role="tablist"
              aria-label="Admin and design modes"
            >
              {(
                [
                  { mode: "frames" as const, Icon: LayoutGrid, label: "Frames — frame navigator" },
                  { mode: "brief" as const, Icon: FileText, label: "Domain Brief" },
                  { mode: "code" as const, Icon: Code2, label: "Domain JSON" },
                ] as const
              ).map(({ mode, Icon, label }) => {
                const active = centerPanelMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={label}
                    onClick={() => setCenterPanelMode(mode)}
                    className="flex items-center justify-center transition-colors"
                    style={{
                      width: 28,
                      height: 26,
                      color: active ? "#faf8f5" : "#57534e",
                      background: active ? "#1c1917" : "transparent",
                      border: "none",
                    }}
                  >
                    <Icon className="h-[13px] w-[13px]" strokeWidth={1.75} aria-hidden />
                  </button>
                )
              })}
            </div>
          </div>

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
            <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
              {centerPanelMode === "feed" && domainSlug ? (
                <DomainFeed domainSlug={domainSlug} domainFrame={liveDomainFrame} />
              ) : null}

              {centerPanelMode === "feed" && !domainSlug ? (
                <div className="flex-1 flex items-center justify-center text-sm text-stone-500">No domain loaded</div>
              ) : null}

              {centerPanelMode === "chat" ? (
                <div
                  className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0"
                  style={{ background: "#fefdfb" }}
                >
                  {messages.length === 0 && (
                    <div className="flex min-h-[120px] items-center justify-center px-4">
                      <p className="text-center text-[13px] max-w-md" style={{ color: "#78716c" }}>
                        Ask Kip anything about this domain — strategy, copy, or what to build next.
                      </p>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} msg={msg} />
                  ))}
                  {isSending && (
                    <div className="flex justify-start">
                      <div
                        className="rounded-xl px-3 py-2.5 text-[13px] border"
                        style={{
                          background: "#f0ece4",
                          color: "#57534e",
                          borderColor: "#e7e5e4",
                        }}
                      >
                        <p
                          className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                          style={{ color: "#78716c" }}
                        >
                          Kip
                        </p>
                        <p>Thinking…</p>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              ) : null}

              {centerPanelMode === "frames" ? (
                <>
                  {selectedFrameKey && activeFrameRow ? (
                    <>
                      <div
                        className="shrink-0 border-b px-3 py-2"
                        style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
                      >
                        <div className="flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "thin" }}>
                          {frames.map((frame) => {
                            const picked = frame.key === selectedFrameKey
                            return (
                              <button
                                key={frame.key}
                                type="button"
                                onClick={() => setSelectedFrameKey(frame.key)}
                                className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
                                style={{
                                  background: picked ? "#1c1917" : "#f0ece4",
                                  color: picked ? "#faf8f5" : "#44403c",
                                }}
                              >
                                <span
                                  className="shrink-0 rounded-full"
                                  style={{ width: 6, height: 6, background: frame.dotColor }}
                                />
                                {abbrevFrameLabel(frame.name)}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div
                        className="shrink-0 relative overflow-hidden border-b transition-all duration-200 min-h-[120px]"
                        style={{
                          borderColor: "rgba(255,255,255,0.12)",
                          ...(bannerBgUrl
                            ? {
                                backgroundImage: `url(${bannerBgUrl})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : {
                                background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                              }),
                        }}
                      >
                        <div
                          className="absolute inset-0 z-0 pointer-events-none"
                          style={{
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            background: "rgba(0,0,0,0.45)",
                          }}
                        />
                        <div className="relative z-[1] px-5 py-4 flex flex-col justify-center min-h-[120px]">
                          <button
                            type="button"
                            onClick={() => setSelectedFrameKey(null)}
                            className="absolute left-5 top-4 text-xs text-white/50 hover:text-white/80 transition-colors text-left"
                          >
                            ← All Frames
                          </button>
                          <div className="mt-6 flex flex-wrap items-center gap-2 gap-y-1">
                            <h2 className="text-2xl font-semibold text-white tracking-tight leading-tight">
                              {activeFrameRow.name}
                            </h2>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                              style={BANNER_BADGE_STYLES[activeFrameRow.badge] ?? BANNER_BADGE_STYLES.default}
                            >
                              {activeFrameRow.badge}
                            </span>
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                              style={{
                                borderColor: "rgba(52,211,153,0.65)",
                                background: "rgba(52,211,153,0.2)",
                                color: "#d1fae5",
                              }}
                            >
                              Live
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-white/60 leading-snug line-clamp-2">{frameContextLine}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="shrink-0 px-6 py-4 text-center border-b border-[#e7e5e4]">
                      <button
                        type="button"
                        onClick={goPresentJourney}
                        className="w-full max-w-sm mx-auto rounded-lg px-4 py-3 text-[14px] font-medium transition-opacity"
                        style={{ background: "#1c1917", color: "#faf8f5" }}
                      >
                        Begin the Journey
                      </button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
                    {selectedFrameKey && messages.length === 0 && (
                      <div className="flex min-h-[80px] items-center justify-center">
                        <p className="text-center text-[13px] max-w-xs" style={{ color: "#57534e" }}>
                          {`Tell Kip what you want to explore on ${activeFrameRow?.name ?? "this domain"}.`}
                        </p>
                      </div>
                    )}
                    {!selectedFrameKey && messages.length === 0 && (
                      <div className="flex min-h-[120px] items-center justify-center px-4">
                        <p className="text-center text-[13px] max-w-md" style={{ color: "#78716c" }}>
                          Select a frame from the left to focus Kip on a specific surface, or ask about the whole
                          domain below.
                        </p>
                      </div>
                    )}
                    {messages.map((msg) => (
                      <MessageBubble key={msg.id} msg={msg} />
                    ))}
                    {isSending && (
                      <div className="flex justify-start">
                        <div
                          className="rounded-xl px-3 py-2.5 text-[13px] border"
                          style={{
                            background: "#f0ece4",
                            color: "#57534e",
                            borderColor: "#e7e5e4",
                          }}
                        >
                          <p
                            className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                            style={{ color: "#78716c" }}
                          >
                            Kip
                          </p>
                          <p>Thinking…</p>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>
                </>
              ) : null}

              {centerPanelMode === "brief" ? (
                <div className="flex-1 overflow-y-auto min-h-0">
                  {liveDomainFrame ? (
                    <DomainBrief domainFrame={liveDomainFrame} />
                  ) : (
                    <div className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                      Loading domain brief…
                    </div>
                  )}
                </div>
              ) : null}

              {centerPanelMode === "code" ? (
                <div className="flex-1 overflow-auto px-4 py-3 min-h-0" style={{ background: "#fefdfb" }}>
                  <pre
                    className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words"
                    style={{ color: "#292524" }}
                  >
                    {liveDomainFrame
                      ? JSON.stringify(liveDomainFrame, null, 2)
                      : "// Domain frame not loaded yet"}
                  </pre>
                </div>
              ) : null}
            </div>
            {renderKipComposer()}
          </StyleScope>
          </div>
        </div>

        {/* Right */}
        <div
          className="shrink-0 flex flex-col border-l border-gray-200 bg-[#faf8f5] min-h-0 overflow-y-auto"
          style={{ width: 380 }}
        >
          <div
            className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[#e7e5e4]"
          >
            <span className="text-[13px] font-semibold" style={{ color: "#1c1917" }}>
              Domain
            </span>
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
          <div className="px-4 py-4 space-y-4 text-[13px]" style={{ color: "#44403c" }}>
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
        </div>
      </div>
    </div>
  )
}
