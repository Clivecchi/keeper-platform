"use client"

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerMessage } from "./DesignBoard"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"

// ─── Types ────────────────────────────────────────────────────────────────────

export type FrameItem = {
  key: string
  name: string
  dotColor: string
  badge: "default" | "primary" | "panel"
}

type ViewMode = "frames" | "dialog" | "preview"

// ─── Hard-coded board data ────────────────────────────────────────────────────

export const BOARD_FRAMES: Record<string, FrameItem[]> = {
  domain: [
    { key: "cover", name: "Board Cover", dotColor: "#7F77DD", badge: "default" },
    { key: "feed", name: "Feed Frame", dotColor: "#1D9E75", badge: "primary" },
    { key: "journeys", name: "Journeys Frame", dotColor: "#378ADD", badge: "panel" },
    { key: "keepers", name: "Keepers Frame", dotColor: "#BA7517", badge: "panel" },
    { key: "moments", name: "Moments Frame", dotColor: "#D4537E", badge: "panel" },
    { key: "relationships", name: "Relationships Frame", dotColor: "#888780", badge: "panel" },
  ],
  design: [],
  "keeper-starter": [],
}

export const BOARD_NAMES: Record<string, string> = {
  domain: "Domain Board",
  design: "Design Board",
  "keeper-starter": "Keeper Starter",
}

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

// ─── SVG icons for view toggle (13px) ─────────────────────────────────────────

function FramesIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function DialogIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M2 2.5A1.5 1.5 0 013.5 1h6A1.5 1.5 0 0111 2.5v5A1.5 1.5 0 019.5 9H5L2.5 11.5V9H2A.5.5 0 012 8.5v-6z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M1.5 6.5S3.5 3 6.5 3s5 3.5 5 3.5-2 3.5-5 3.5-5-3.5-5-3.5z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <circle cx="6.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

// ─── Badge colors ─────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, React.CSSProperties> = {
  default: { background: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" },
  primary: { background: "#ecfdf5", color: "#059669", borderColor: "#a7f3d0" },
  panel: { background: "#eff6ff", color: "#3b82f6", borderColor: "#bfdbfe" },
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

// ─── Message bubble (same behavior as DesignBoardKip) ────────────────────────

function MessageBubble({ msg }: { msg: DesignerMessage }) {
  const isUser = msg.role === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className="max-w-[80%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
        style={{
          background: isUser
            ? "hsl(var(--theme-ink-primary, 0 0% 10%))"
            : "hsl(var(--theme-surface-raised, 0 0% 94%))",
          color: isUser
            ? "hsl(var(--theme-surface-paper, 0 0% 100%))"
            : "var(--theme-ink-primary, #111)",
        }}
      >
        {!isUser && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest opacity-50">
            Kip
          </p>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
        {!!msg.draftProposal && (
          <p className="mt-1.5 text-[10px] opacity-60">
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
  messages: DesignerMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DesignerMessage[]>>
  draftId: string | null
  setDraftId: (id: string | null) => void
  setDraftSpecJson: (spec: DomainFrameJson | null) => void
  hasDraftSpec: boolean
  isPublishing: boolean
  publishSuccess: boolean
  onPublish: () => void
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
  messages,
  setMessages,
  draftId,
  setDraftId,
  setDraftSpecJson,
  hasDraftSpec,
  isPublishing,
  publishSuccess,
  onPublish,
}: DesignBoardFrameListProps) {
  const [viewMode, setViewMode] = React.useState<ViewMode>("frames")
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
  }, [messages, isSending, activeFrameKey])

  const addMessage = React.useCallback(
    (m: DesignerMessage) => setMessages((prev) => [...prev, m]),
    [setMessages],
  )

  // ── Kip send handler (preserved from DesignBoardKip.tsx) ──
  const handleSend = async () => {
    const text = input.trim()
    if (!text || !domainId || !activeFrameKey || isSending) return

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
          frameKey: activeFrameKey,
          conversationHistory: history,
        }),
      })) as { response: string; draft?: { spec_json: unknown } }

      const frameBlock = result.draft?.spec_json ?? undefined

      addMessage({
        id: uid(),
        role: "kip",
        content: result.response ?? "(no response)",
        draftProposal: frameBlock,
      })

      if (frameBlock !== undefined && typeof frameBlock === "object" && frameBlock !== null) {
        const fullSpec = buildFullSpec(liveDomainFrame, activeFrameKey, frameBlock)

        if (isDesignerDebug()) {
          const jsonKey = FRAME_TO_JSON_KEY[activeFrameKey] ?? null
          const block = jsonKey
            ? (fullSpec as unknown as Record<string, unknown>)[jsonKey]
            : null
          console.log("[DesignBoard:debug] setDraftSpecJson", {
            frameKey: activeFrameKey,
            fullSpecKeys: Object.keys(fullSpec as object),
            frameBlockKeys: block && typeof block === "object" ? Object.keys(block) : null,
          })
        }
        setDraftSpecJson(fullSpec)

        try {
          const frameDisplayName = FRAME_DISPLAY_NAMES[activeFrameKey] ?? activeFrameKey
          const draft = await KipApi.createDraft(domainId, {
            kind: "domain_json",
            key: `designer-${activeFrameKey}-${Date.now()}`,
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

  const VIEW_MODES: { mode: ViewMode; Icon: React.FC }[] = [
    { mode: "frames", Icon: FramesIcon },
    { mode: "dialog", Icon: DialogIcon },
    { mode: "preview", Icon: EyeIcon },
  ]

  const draftBar =
    hasDraftSpec || publishSuccess ? (
      <div
        className="shrink-0 px-4 py-3 border-t flex items-center justify-between gap-3"
        style={{
          borderColor: "#e5e7eb",
          background: publishSuccess ? "hsl(142 71% 96%)" : "hsl(43 100% 97%)",
        }}
      >
        <p
          className="text-[12px] font-medium"
          style={{ color: publishSuccess ? "hsl(142 71% 25%)" : "hsl(43 80% 30%)" }}
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
            style={{ background: "#111827", color: "#fff" }}
          >
            {isPublishing ? "Publishing\u2026" : "Publish"}
          </button>
        )}
      </div>
    ) : null

  const inputPlaceholder = activeFrameKey
    ? `Ask Kip about ${activeFrameRow?.name ?? "this frame"}\u2026`
    : "Select a frame to begin"

  const chatInputClass =
    "flex-1 rounded-lg border px-3 py-2 text-[13px] outline-none transition-colors disabled:opacity-40"

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b"
        style={{ borderColor: "#e5e7eb" }}
      >
        <p
          className="text-[13px] font-semibold truncate"
          style={{ color: "#111827" }}
        >
          {boardName}
        </p>

        {/* View toggle pill */}
        <div
          className="flex items-center rounded-md overflow-hidden shrink-0"
          style={{ border: "1px solid #e5e7eb", background: "#f9fafb" }}
        >
          {VIEW_MODES.map(({ mode, Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 28,
                height: 26,
                background: viewMode === mode ? "#ffffff" : "transparent",
                color: viewMode === mode ? "#111827" : "#9ca3af",
                boxShadow: viewMode === mode ? "0 0 0 1px #e5e7eb" : "none",
              }}
              aria-label={mode}
            >
              <Icon />
            </button>
          ))}
        </div>
      </div>

      {activeFrameKey && activeFrameRow ? (
        <>
          {/* Focus mode — frame rail */}
          <div
            className="shrink-0 border-b px-3 py-2 transition-all duration-200 ease-out"
            style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
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
                      background: picked ? "#111827" : "#f3f4f6",
                      color: picked ? "#ffffff" : "#374151",
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
            className="shrink-0 border-b px-4 py-3 transition-all duration-200"
            style={{ borderColor: "#e5e7eb", background: "#ffffff" }}
          >
            <button
              type="button"
              onClick={onClearFrameSelection}
              className="mb-2 text-[11px] font-medium transition-colors hover:underline text-left block w-full"
              style={{ color: "#6b7280" }}
            >
              ← All Frames
            </button>
            <div className="flex flex-wrap items-center gap-2 gap-y-1">
              <h2
                className="text-[17px] font-semibold leading-tight"
                style={{ color: "#111827" }}
              >
                {activeFrameRow.name}
              </h2>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium border"
                style={BADGE_STYLES[activeFrameRow.badge] ?? BADGE_STYLES.default}
              >
                {activeFrameRow.badge}
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                style={
                  hasDraftSpec
                    ? {
                        borderColor: "#fcd34d",
                        background: "#fffbeb",
                        color: "#92400e",
                      }
                    : {
                        borderColor: "#bbf7d0",
                        background: "#ecfdf5",
                        color: "#047857",
                      }
                }
              >
                {hasDraftSpec ? "Draft" : "Live"}
              </span>
            </div>
            <p
              className="mt-2 text-[12px] leading-snug line-clamp-2"
              style={{ color: "#6b7280" }}
            >
              {frameContextLine}
            </p>
          </div>

          {/* Kip thread + draft + input (focus) */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
              {messages.length === 0 && (
                <div className="flex min-h-[100px] items-center justify-center">
                  <p
                    className="text-center text-[13px] max-w-xs"
                    style={{ color: "#6b7280" }}
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
                    className="rounded-xl px-3 py-2.5 text-[13px]"
                    style={{
                      background: "hsl(var(--theme-surface-raised, 0 0% 94%))",
                      color: "var(--theme-ink-secondary, #6b7280)",
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-1 opacity-50">
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
              style={{ borderColor: "#e5e7eb", background: "#fafafa" }}
            >
              {sendError && (
                <p className="mb-2 text-[11px] text-red-500">{sendError}</p>
              )}
              <div className="flex items-center gap-2">
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: "#f3f4f6",
                    color: "#6b7280",
                    border: "1px solid #e5e7eb",
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
                  disabled={!activeFrameKey || isSending}
                  className={chatInputClass}
                  style={{
                    borderColor: "#d1d5db",
                    background: "#ffffff",
                    color: "#111827",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim() || !activeFrameKey || isSending}
                  className="rounded-lg p-2 transition-opacity disabled:opacity-30 shrink-0"
                  style={{ background: "#111827", color: "#fff" }}
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
            <ul className="py-1">
              {frames.map((frame) => {
                const isActive = frame.key === activeFrameKey
                return (
                  <li key={frame.key}>
                    <button
                      type="button"
                      onClick={() => onSelectFrame(frame.key)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                      style={{
                        background: isActive ? "#f3f4f6" : "transparent",
                        borderLeft: isActive ? "2px solid #111827" : "2px solid transparent",
                      }}
                    >
                      <span
                        className="shrink-0 rounded-full"
                        style={{ width: 8, height: 8, background: frame.dotColor }}
                      />
                      <span
                        className="flex-1 text-[13px] leading-snug truncate"
                        style={{
                          color: isActive ? "#111827" : "#4b5563",
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
                  border: "1px dashed #d1d5db",
                  color: "#9ca3af",
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
            style={{ borderColor: "#e5e7eb", background: "#fafafa", opacity: 0.45 }}
          >
            {sendError && (
              <p className="mb-2 text-[11px] text-red-500">{sendError}</p>
            )}
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: "#f3f4f6",
                  color: "#9ca3af",
                  border: "1px solid #e5e7eb",
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
                disabled
                className={chatInputClass}
                style={{
                  borderColor: "#e5e7eb",
                  background: "#f9fafb",
                  color: "#9ca3af",
                }}
              />
              <button
                type="button"
                disabled
                className="rounded-lg p-2 opacity-30 shrink-0"
                style={{ background: "#111827", color: "#fff" }}
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
      )}
    </div>
  )
}
