"use client"

import * as React from "react"
import { Code2, FileText, LayoutGrid } from "lucide-react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
// DesignerMessage defined here; legacy consumers (DesignBoardKip) import from this file.
export type DesignerMessage = {
  id: string
  role: "user" | "kip"
  content: string
  draftProposal?: unknown
}
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import { DomainBrief } from "../../components/DomainBrief"
import { BOARD_FRAMES, BOARD_NAMES, type FrameItem } from "../frameCatalog"

export type { FrameItem } from "../frameCatalog"
export { BOARD_FRAMES, BOARD_NAMES } from "../frameCatalog"

type CenterPanelMode = "frames" | "brief" | "code"

// ─── Helpers (preserved from DesignBoardKip.tsx) ──────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function isDesignerDebug(): boolean {
  if (typeof window === "undefined") return false
  const env = (import.meta as any)?.env?.VITE_DESIGNER_DEBUG
  if (env === "1" || env === "true") return true
  return Boolean((window as any).__keeperDebug?.designer)
}

function buildFullSpec(
  liveDomainFrame: DomainFrameJson | null,
  frameKey: string,
  frameBlock: unknown,
): DomainFrameJson {
  const jsonKey = FRAME_TO_JSON_KEY[frameKey] ?? null
  const base = liveDomainFrame
    ? { ...(liveDomainFrame as unknown as Record<string, unknown>) }
    : {}
  if (jsonKey) {
    return { ...base, [jsonKey]: frameBlock } as unknown as DomainFrameJson
  }
  return base as unknown as DomainFrameJson
}

// ─── Badge colors ─────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: { background: "#f0ece4", color: "#57534e", borderColor: "#d6d3d1" },
  primary: { background: "#ecfdf5", color: "#047857", borderColor: "#6ee7b7" },
  panel: { background: "#e0e7ff", color: "#1d4ed8", borderColor: "#a5b4fc" },
}

/** Role badges on the dark frame context banner */
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

/** `DomainFrameJson.theme.background` — image path or URL for cover-style imagery (see cover-frame.tsx). */
function themeBackgroundImageUrl(
  theme: DomainFrameJson["theme"] | undefined,
): string | null {
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
  const raw =
    obj.frame_title ??
    labels?.frame_title ??
    labels?.frameTitle
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

function abbrevFrameLabel(name: string): string {
  const shortened = name.replace(/\s+Frame$/i, "").trim()
  const s = shortened.length > 0 ? shortened : name
  return s.length > 14 ? `${s.slice(0, 12)}…` : s
}

function frameBlockDiffersFromLive(
  frameKey: string,
  live: DomainFrameJson | null,
  draft: DomainFrameJson | null,
): boolean {
  if (!live || !draft) return false
  const jsonKey = FRAME_TO_JSON_KEY[frameKey]
  if (!jsonKey) return false
  const a = (live as unknown as Record<string, unknown>)[jsonKey]
  const b = (draft as unknown as Record<string, unknown>)[jsonKey]
  try {
    return JSON.stringify(a) !== JSON.stringify(b)
  } catch {
    return true
  }
}

// ─── Message bubble (same behavior as DesignBoardKip) ────────────────────────

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
          <p
            className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "#78716c" }}
          >
            Kip
          </p>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
        {!!msg.draftProposal && (
          <p className="mt-1.5 text-[10px]" style={{ color: "#78716c" }}>
            ↑ Draft proposal generated
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DesignBoardFrameListProps {
  activeBoardId: string
  activeFrameKey: string | null
  onSelectFrame: (key: string) => void
  onClearFrameSelection: () => void
  domainId: string | null
  domainSlug: string
  liveDomainFrame: DomainFrameJson | null
  /** When set, frames whose JSON block differs from live are shown as draft (amber). */
  draftSpecJson: DomainFrameJson | null
  messages: DesignerMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DesignerMessage[]>>
  draftId: string | null
  setDraftId: (id: string | null) => void
  setDraftSpecJson: (spec: DomainFrameJson | null) => void
  hasDraftSpec: boolean
  isPublishing: boolean
  publishSuccess: boolean
  onPublish: () => void
  /** Persistent Dialog ID for this context — null until the first message is sent */
  dialogId: string | null
  /** Callback to store the dialog_id returned from the backend */
  setDialogId: (id: string | null) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignBoardFrameList({
  activeBoardId,
  activeFrameKey,
  onSelectFrame,
  onClearFrameSelection,
  domainId,
  domainSlug: _domainSlug,
  liveDomainFrame,
  draftSpecJson,
  messages,
  setMessages,
  draftId,
  setDraftId,
  setDraftSpecJson,
  hasDraftSpec,
  isPublishing,
  publishSuccess,
  onPublish,
  dialogId,
  setDialogId,
}: DesignBoardFrameListProps) {
  const [centerPanelMode, setCenterPanelMode] = React.useState<CenterPanelMode>("frames")
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  const frames = BOARD_FRAMES[activeBoardId] ?? []
  const boardName = BOARD_NAMES[activeBoardId] ?? activeBoardId
  const activeFrameRow = activeFrameKey
    ? frames.find((f) => f.key === activeFrameKey) ?? null
    : null

  const jsonKeyForActive = activeFrameKey ? FRAME_TO_JSON_KEY[activeFrameKey] ?? null : null
  const frameBlockForActive =
    jsonKeyForActive && liveDomainFrame
      ? (liveDomainFrame as unknown as Record<string, unknown>)[jsonKeyForActive]
      : null
  const frameContextLine =
    (activeFrameRow && extractFrameTitleFromBlock(frameBlockForActive)) ?? activeFrameRow?.name ?? ""

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending, activeFrameKey, centerPanelMode])

  const addMessage = React.useCallback(
    (m: DesignerMessage) => setMessages((prev) => [...prev, m]),
    [setMessages],
  )

  // ── Kip send handler (preserved from DesignBoardKip.tsx) ──
  const handleSend = async () => {
    const text = input.trim()
    if (!text || !domainId || isSending) return
    if (centerPanelMode === "frames" && !activeFrameKey) return

    const frameKeyForKip = activeFrameKey ?? "cover"

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
          frameKey: frameKeyForKip,
          conversationHistory: history,
          dialog_id: dialogId ?? undefined,
          dialog_board: "designer",
        }),
      })) as { response: string; draft?: { spec_json: unknown }; dialog_id?: string; session_id?: string }

      // Persist the dialog_id so subsequent messages attach to the same Dialog
      if (result.dialog_id && result.dialog_id !== dialogId) {
        setDialogId(result.dialog_id)
      }

      const frameBlock = result.draft?.spec_json ?? undefined

      addMessage({
        id: uid(),
        role: "kip",
        content: result.response ?? "(no response)",
        draftProposal: frameBlock,
      })

      if (frameBlock !== undefined && typeof frameBlock === "object" && frameBlock !== null) {
        const fullSpec = buildFullSpec(liveDomainFrame, frameKeyForKip, frameBlock)

        if (isDesignerDebug()) {
          const jsonKey = FRAME_TO_JSON_KEY[frameKeyForKip] ?? null
          const block = jsonKey
            ? (fullSpec as unknown as Record<string, unknown>)[jsonKey]
            : null
          console.log("[DesignBoard:debug] setDraftSpecJson", {
            frameKey: frameKeyForKip,
            fullSpecKeys: Object.keys(fullSpec as object),
            frameBlockKeys: block && typeof block === "object" ? Object.keys(block) : null,
          })
        }
        setDraftSpecJson(fullSpec)

        try {
          const frameDisplayName = FRAME_DISPLAY_NAMES[frameKeyForKip] ?? frameKeyForKip
          const draft = await KipApi.createDraft(domainId, {
            kind: "domain_json",
            key: `designer-${frameKeyForKip}-${Date.now()}`,
            title: `${frameDisplayName} proposal`,
            spec: fullSpec,
          })
          setDraftId(draft.id)
        } catch (draftErr: any) {
          console.error("[DesignBoardFrameList] auto-create draft failed:", draftErr)
          setSendError(
            `Draft creation failed: ${draftErr?.message ?? "unknown error"}. The preview is shown but publish is unavailable.`,
          )
        }
      }
    } catch (err: any) {
      setSendError(err?.message ?? "Failed to send message")
      addMessage({
        id: uid(),
        role: "kip",
        content: "Sorry, something went wrong. Please try again.",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const CENTER_MODES: {
    mode: CenterPanelMode
    Icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>
    label: string
  }[] = [
    { mode: "frames", Icon: LayoutGrid, label: "Frames — frame navigator" },
    { mode: "brief", Icon: FileText, label: "Domain Brief" },
    { mode: "code", Icon: Code2, label: "Domain JSON" },
  ]

  const draftBar =
    hasDraftSpec || publishSuccess ? (
      <div
        className="shrink-0 px-4 py-3 border-t flex items-center justify-between gap-3"
        style={{
          borderColor: "#d6d3d1",
          background: publishSuccess ? "#ecfdf5" : "#fffbeb",
        }}
      >
        <p
          className="text-[12px] font-medium"
          style={{ color: publishSuccess ? "#14532d" : "#92400e" }}
        >
          {publishSuccess
            ? "\u2713 Published \u2014 live platform updated"
            : draftId
              ? "Draft ready \u2014 review preview, then publish"
              : "Edit staged \u2014 review preview, then publish"}
        </p>
        {hasDraftSpec && !publishSuccess && (
          <button
            type="button"
            onClick={onPublish}
            disabled={isPublishing}
            className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50 shrink-0"
            style={{ background: "#1c1917", color: "#faf8f5" }}
          >
            {isPublishing ? "Publishing\u2026" : "Publish"}
          </button>
        )}
      </div>
    ) : null

  const inputPlaceholder =
    centerPanelMode === "brief"
      ? "Ask Kip about the domain brief\u2026"
      : centerPanelMode === "code"
        ? "Ask Kip about domain JSON\u2026"
        : activeFrameKey
          ? `Ask Kip about ${activeFrameRow?.name ?? "this frame"}\u2026`
          : "Select a frame to begin"

  const kipComposerDisabled =
    isSending ||
    !domainId ||
    (centerPanelMode === "frames" && !activeFrameKey)

  const chatInputClass =
    "design-board-chat-input flex-1 rounded-lg border px-3 py-3 min-h-[48px] text-[13px] outline-none transition-colors box-border focus-visible:ring-2 focus-visible:ring-stone-400/50 focus-visible:border-stone-400"

  const bannerBgUrl = themeBackgroundImageUrl(liveDomainFrame?.theme)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="density-content flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: "#e7e5e4" }}
      >
        <p
          className="text-[13px] font-semibold truncate"
          style={{ color: "#1c1917" }}
        >
          {boardName}
        </p>

        {/* Center panel mode — frames / brief / code */}
        <div
          className="flex items-center rounded-md overflow-hidden shrink-0"
          style={{ border: "1px solid #d6d3d1", background: "#faf8f5" }}
          role="tablist"
          aria-label="Center panel mode"
        >
          {CENTER_MODES.map(({ mode, Icon, label }) => {
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
                  width: 32,
                  height: 28,
                  color: active ? "#faf8f5" : "#57534e",
                  background: active ? "#1c1917" : "transparent",
                  boxShadow: "none",
                  border: "none",
                }}
              >
                <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} aria-hidden />
              </button>
            )
          })}
        </div>
      </div>

      {centerPanelMode === "frames" ? (
        activeFrameKey && activeFrameRow ? (
        <>
          {/* Focus mode — frame rail */}
          <div
            className="shrink-0 border-b px-3 py-2 transition-all duration-200 ease-out"
            style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
          >
            <div
              className="flex gap-2 overflow-x-auto pb-0.5"
              style={{ scrollbarWidth: "thin" }}
            >
              {frames.map((frame) => {
                const picked = frame.key === activeFrameKey
                return (
                  <button
                    key={frame.key}
                    type="button"
                    onClick={() => onSelectFrame(frame.key)}
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

          {/* Frame context banner */}
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
                    background:
                      "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
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
                onClick={onClearFrameSelection}
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
                  style={
                    BANNER_BADGE_STYLES[activeFrameRow.badge] ?? BANNER_BADGE_STYLES["default"]
                  }
                >
                  {activeFrameRow.badge}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                  style={
                    hasDraftSpec
                      ? {
                          borderColor: "rgba(251,191,36,0.65)",
                          background: "rgba(251,191,36,0.22)",
                          color: "#fef3c7",
                        }
                      : {
                          borderColor: "rgba(52,211,153,0.65)",
                          background: "rgba(52,211,153,0.2)",
                          color: "#d1fae5",
                        }
                  }
                >
                  {hasDraftSpec ? "Draft" : "Live"}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/60 leading-snug line-clamp-2">
                {frameContextLine}
              </p>
            </div>
          </div>

          {/* Kip thread + draft + input (focus) */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="flex min-h-[100px] items-center justify-center">
                  <p
                    className="text-center text-[13px] max-w-xs"
                    style={{ color: "#57534e" }}
                  >
                    {`Tell Kip what you want to change about the ${activeFrameRow.name}.`}
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
            {draftBar}
            <div
              className="shrink-0 border-t px-3 py-3"
              style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
            >
              {sendError && (
                <p className="mb-2 text-[11px] text-red-600 font-medium">{sendError}</p>
              )}
              <div className="flex items-center gap-2">
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-center"
                  style={{
                    background: "#e7e5e4",
                    color: "#44403c",
                    border: "1px solid #d6d3d1",
                  }}
                >
                  Kip
                </span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  disabled={kipComposerDisabled}
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
                  onClick={handleSend}
                  disabled={!input.trim() || kipComposerDisabled}
                  className="rounded-lg p-2 transition-opacity disabled:opacity-40 shrink-0"
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
          </div>
        </>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-4 pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Designing
              </p>
            </div>
            <ul className="py-1">
              {frames.map((frame) => {
                const isActive = frame.key === activeFrameKey
                const isDraftRow = frameBlockDiffersFromLive(frame.key, liveDomainFrame, draftSpecJson)
                return (
                  <li key={frame.key}>
                    <button
                      type="button"
                      onClick={() => onSelectFrame(frame.key)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isActive ? "#f0ece4" : "transparent",
                        borderLeft: isActive ? "2px solid #1c1917" : "2px solid transparent",
                      }}
                    >
                      <span
                        className="shrink-0 rounded-full"
                        style={{
                          width: 6,
                          height: 6,
                          background: isDraftRow ? "#f59e0b" : "#10b981",
                        }}
                        title={isDraftRow ? "Draft differs from live" : "Live"}
                      />
                      <span
                        className="flex-1 text-[13px] leading-snug truncate"
                        style={{
                          color: isActive ? "#1c1917" : "#44403c",
                          fontWeight: isActive ? 500 : 400,
                        }}
                      >
                        {frame.name}
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
            <div className="px-4 py-2">
              <button
                type="button"
                disabled
                className="w-full py-2 rounded-md text-[12px] cursor-not-allowed transition-colors"
                style={{
                  border: "1px dashed #d6d3d1",
                  color: "#78716c",
                  background: "transparent",
                }}
              >
                + Add Frame
              </button>
            </div>
          </div>
          {draftBar}
          <div
            className="shrink-0 border-t px-3 py-3"
            style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
          >
            {sendError && (
              <p className="mb-2 text-[11px] text-red-600 font-medium">{sendError}</p>
            )}
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-center"
                style={{
                  background: "#e7e5e4",
                  color: "#57534e",
                  border: "1px solid #d6d3d1",
                }}
              >
                Kip
              </span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                disabled={kipComposerDisabled}
                className={chatInputClass}
                style={{
                  borderColor: "#d6d3d1",
                  background: kipComposerDisabled ? "#faf8f5" : "#fefdfb",
                  color: kipComposerDisabled ? "#57534e" : "#1c1917",
                }}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || kipComposerDisabled}
                className="rounded-lg p-2 transition-opacity disabled:opacity-40 shrink-0"
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
        </>
      )
      )
      : null}

      {centerPanelMode === "brief" && (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto min-h-0">
            {liveDomainFrame ? (
              <DomainBrief domainFrame={liveDomainFrame} />
            ) : (
              <div className="px-4 py-6 text-[13px]" style={{ color: "#57534e" }}>
                Loading domain brief…
              </div>
            )}
          </div>
          {draftBar}
          <div
            className="shrink-0 border-t px-3 py-3"
            style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
          >
            {sendError && (
              <p className="mb-2 text-[11px] text-red-600 font-medium">{sendError}</p>
            )}
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-center"
                style={{
                  background: "#e7e5e4",
                  color: "#44403c",
                  border: "1px solid #d6d3d1",
                }}
              >
                Kip
              </span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                disabled={kipComposerDisabled}
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
                onClick={handleSend}
                disabled={!input.trim() || kipComposerDisabled}
                className="rounded-lg p-2 transition-opacity disabled:opacity-40 shrink-0"
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
        </div>
      )}

      {centerPanelMode === "code" && (
        <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
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
          {draftBar}
          <div
            className="shrink-0 border-t px-3 py-3"
            style={{ borderColor: "#e7e5e4", background: "#f5f2eb" }}
          >
            {sendError && (
              <p className="mb-2 text-[11px] text-red-600 font-medium">{sendError}</p>
            )}
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold self-center"
                style={{
                  background: "#e7e5e4",
                  color: "#44403c",
                  border: "1px solid #d6d3d1",
                }}
              >
                Kip
              </span>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={inputPlaceholder}
                disabled={kipComposerDisabled}
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
                onClick={handleSend}
                disabled={!input.trim() || kipComposerDisabled}
                className="rounded-lg p-2 transition-opacity disabled:opacity-40 shrink-0"
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
        </div>
      )}
      </div>
    </div>
  )
}
