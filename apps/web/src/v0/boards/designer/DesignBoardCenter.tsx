"use client"

/**
 * DesignBoardCenter
 * =================
 * KE3P · Keeper Platform · Design Board — Center Panel
 *
 * Kip in Design Mode. Purpose: design the domain, not manage content.
 *
 * Structure:
 *   [Mode switcher]  — frames / brief / code — compact icon tabs at top
 *   [Frame rail]     — horizontal pill chips, visible when a frame is active
 *   [KeeperDialogFrame] — conversation shell
 *     Zone 1 — Banner: primary="Design", secondary=frame or board name
 *     Zone 2 — dialogContent: mode-specific surface (messages, brief, JSON)
 *     Zone 3 — AgentComposer: agentName="Design"
 *
 * API endpoint: POST /api/domains/:domainId/kip/designer — unchanged.
 *
 * CRITICAL RULES:
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - agentName is always "Design" — never "Kip", never "Rendr".
 * - handleSend calls /api/domains/:domainId/kip/designer with dialog_board: "designer".
 */

import * as React from "react"
import { Code2, FileText, LayoutGrid } from "lucide-react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerMessage } from "./DesignBoard"
import { BOARD_FRAMES, BOARD_NAMES, type FrameItem } from "./DesignBoardFrameList"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import { KeeperDialogFrame } from "../../components/dialog/KeeperDialogFrame"
import type { BannerContext } from "../../components/dialog/KeeperDialogFrame"
import type { AgentDialogueMessage } from "../../../components/agent/types"
import { DomainBrief } from "../../components/DomainBrief"
import type { KeeperDensity } from "./DesignBoard"

// ─── Types ────────────────────────────────────────────────────────────────────

type CenterPanelMode = "frames" | "brief" | "code"

export interface DesignBoardCenterProps {
  // Domain identity — resolved by UniversalBoard, passed via center render prop
  domainId: string | null
  domainSlug: string

  // Board/frame selection
  activeBoardId: string
  activeFrameKey: string | null
  onSelectFrame: (key: string) => void
  onClearFrameSelection: () => void

  // Live domain content
  liveDomainFrame: DomainFrameJson | null

  // Draft state — lifted to board root so right panel can read it
  draftSpecJson: DomainFrameJson | null
  setDraftSpecJson: (spec: DomainFrameJson | null) => void
  hasDraftSpec: boolean
  isPublishing: boolean
  publishSuccess: boolean
  onPublish: () => void

  // Message history — lifted so dialog restore can seed it
  messages: DesignerMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DesignerMessage[]>>

  // Draft tracking
  draftId: string | null
  setDraftId: (id: string | null) => void

  // Dialog context — persistent session container
  dialogId: string | null
  setDialogId: (id: string | null) => void

  // Density — stays at board root, surfaced via switcher in center header
  density: KeeperDensity
  onDensityChange: (d: KeeperDensity) => void
}

// ─── Helpers (preserved from DesignBoardFrameList) ────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function isDesignerDebug(): boolean {
  if (typeof window === "undefined") return false
  const env = (import.meta as unknown as { env?: Record<string, unknown> })?.env?.VITE_DESIGNER_DEBUG
  if (env === "1" || env === "true") return true
  return Boolean((window as unknown as { __keeperDebug?: { designer?: boolean } }).__keeperDebug?.designer)
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

function abbrevFrameLabel(name: string): string {
  const shortened = name.replace(/\s+Frame$/i, "").trim()
  const s = shortened.length > 0 ? shortened : name
  return s.length > 14 ? `${s.slice(0, 12)}…` : s
}

// ─── Mode tab bar ─────────────────────────────────────────────────────────────

const CENTER_MODES: {
  mode: CenterPanelMode
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number; "aria-hidden"?: boolean }>
  label: string
}[] = [
  { mode: "frames", Icon: LayoutGrid, label: "Frames — frame navigator" },
  { mode: "brief", Icon: FileText, label: "Domain Brief" },
  { mode: "code", Icon: Code2, label: "Domain JSON" },
]

const DENSITY_SEGMENTS: { key: KeeperDensity; label: string }[] = [
  { key: "compact", label: "Compact" },
  { key: "default", label: "Default" },
  { key: "comfortable", label: "Comfortable" },
]

function ModeTabBar({
  mode,
  onChange,
  density,
  onDensityChange,
}: {
  mode: CenterPanelMode
  onChange: (m: CenterPanelMode) => void
  density: KeeperDensity
  onDensityChange: (d: KeeperDensity) => void
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.3)",
        background: "hsl(var(--theme-surface-panel) / 0.6)",
      }}
    >
      {/* Mode switcher */}
      <div
        className="flex items-center rounded-md overflow-hidden"
        style={{
          border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
          background: "hsl(var(--theme-surface-elevated) / 0.4)",
        }}
        role="tablist"
        aria-label="Center panel mode"
      >
        {CENTER_MODES.map(({ mode: m, Icon, label }) => {
          const active = mode === m
          return (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={label}
              onClick={() => onChange(m)}
              className="flex items-center justify-center transition-colors"
              style={{
                width: 32,
                height: 28,
                color: active
                  ? "hsl(var(--theme-surface-paper))"
                  : "hsl(var(--theme-ink-tertiary))",
                background: active ? "hsl(var(--theme-ink-primary))" : "transparent",
                border: "none",
              }}
            >
              <Icon className="h-[14px] w-[14px]" strokeWidth={1.75} aria-hidden />
            </button>
          )
        })}
      </div>

      {/* Density switcher */}
      <div
        className="flex items-center rounded-md overflow-hidden text-[10px] font-medium"
        style={{
          border: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          background: "hsl(var(--theme-surface-elevated) / 0.3)",
        }}
        role="group"
        aria-label="Display density"
      >
        {DENSITY_SEGMENTS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onDensityChange(key)}
            className="px-2 py-1 transition-colors whitespace-nowrap"
            style={{
              background: density === key ? "hsl(var(--theme-surface-paper))" : "transparent",
              color: density === key
                ? "hsl(var(--theme-ink-primary))"
                : "hsl(var(--theme-ink-tertiary))",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Frame rail ───────────────────────────────────────────────────────────────

function FrameRail({
  frames,
  activeFrameKey,
  onSelect,
}: {
  frames: FrameItem[]
  activeFrameKey: string
  onSelect: (key: string) => void
}) {
  return (
    <div
      className="shrink-0 px-3 py-2 border-b"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.2)",
        background: "hsl(var(--theme-surface-elevated) / 0.3)",
      }}
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
              onClick={() => onSelect(frame.key)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors"
              style={{
                background: picked
                  ? "hsl(var(--theme-ink-primary))"
                  : "hsl(var(--theme-surface-elevated) / 0.6)",
                color: picked
                  ? "hsl(var(--theme-surface-paper))"
                  : "hsl(var(--theme-ink-secondary))",
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
  )
}

// ─── Draft bar ────────────────────────────────────────────────────────────────

function DraftBar({
  hasDraftSpec,
  publishSuccess,
  draftId,
  isPublishing,
  onPublish,
}: {
  hasDraftSpec: boolean
  publishSuccess: boolean
  draftId: string | null
  isPublishing: boolean
  onPublish: () => void
}) {
  if (!hasDraftSpec && !publishSuccess) return null
  return (
    <div
      className="shrink-0 px-4 py-3 border-t flex items-center justify-between gap-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.3)",
        background: publishSuccess
          ? "hsl(152 69% 43% / 0.12)"
          : "hsl(38 92% 50% / 0.10)",
      }}
    >
      <p
        className="text-[12px] font-medium"
        style={{
          color: publishSuccess
            ? "hsl(152 69% 28%)"
            : "hsl(38 92% 32%)",
        }}
      >
        {publishSuccess
          ? "✓ Published — live platform updated"
          : draftId
            ? "Draft ready — review preview, then publish"
            : "Edit staged — review preview, then publish"}
      </p>
      {hasDraftSpec && !publishSuccess && (
        <button
          type="button"
          onClick={onPublish}
          disabled={isPublishing}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity disabled:opacity-50 shrink-0"
          style={{
            background: "hsl(var(--theme-ink-primary))",
            color: "hsl(var(--theme-surface-paper))",
          }}
        >
          {isPublishing ? "Publishing…" : "Publish"}
        </button>
      )}
    </div>
  )
}

// ─── Frame list (no frame selected — frames mode) ─────────────────────────────

function FrameListContent({
  frames,
  activeFrameKey,
  onSelectFrame,
  draftSpecJson,
  liveDomainFrame,
}: {
  frames: FrameItem[]
  activeFrameKey: string | null
  onSelectFrame: (key: string) => void
  draftSpecJson: DomainFrameJson | null
  liveDomainFrame: DomainFrameJson | null
}) {
  return (
    <div className="px-2 pt-1 pb-4">
      <p
        className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Designing
      </p>
      {frames.map((frame) => {
        const isActive = frame.key === activeFrameKey
        const jsonKey = FRAME_TO_JSON_KEY[frame.key]
        const isDraft =
          !!(
            jsonKey &&
            liveDomainFrame &&
            draftSpecJson &&
            JSON.stringify(
              (liveDomainFrame as unknown as Record<string, unknown>)[jsonKey],
            ) !==
              JSON.stringify(
                (draftSpecJson as unknown as Record<string, unknown>)[jsonKey],
              )
          )

        return (
          <button
            key={frame.key}
            type="button"
            onClick={() => onSelectFrame(frame.key)}
            className="w-full flex items-center gap-3 px-2 py-2.5 rounded-md text-left transition-colors"
            style={{
              background: isActive ? "hsl(var(--theme-surface-elevated))" : "transparent",
              borderLeft: `2px solid ${
                isActive ? "hsl(var(--theme-ink-primary))" : "transparent"
              }`,
            }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 6,
                height: 6,
                background: isDraft ? "hsl(38 92% 50%)" : "hsl(152 69% 43%)",
              }}
              title={isDraft ? "Draft differs from live" : "Live"}
            />
            <span
              className="flex-1 text-[13px] leading-snug truncate"
              style={{
                color: isActive
                  ? "hsl(var(--theme-ink-primary))"
                  : "hsl(var(--theme-ink-secondary))",
                fontWeight: isActive ? 500 : 400,
              }}
            >
              {frame.name}
            </span>
          </button>
        )
      })}
      <button
        type="button"
        disabled
        className="w-full mt-1 py-2 rounded-md text-[12px] cursor-not-allowed transition-colors"
        style={{
          border: "1px dashed hsl(var(--theme-border-soft) / 0.5)",
          color: "hsl(var(--theme-ink-tertiary))",
          background: "transparent",
        }}
      >
        + Add Frame
      </button>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignBoardCenter({
  domainId,
  domainSlug: _domainSlug,
  activeBoardId,
  activeFrameKey,
  onSelectFrame,
  onClearFrameSelection,
  liveDomainFrame,
  draftSpecJson,
  setDraftSpecJson,
  hasDraftSpec,
  isPublishing,
  publishSuccess,
  onPublish,
  messages,
  setMessages,
  draftId,
  setDraftId,
  dialogId,
  setDialogId,
  density,
  onDensityChange,
}: DesignBoardCenterProps) {
  const [centerPanelMode, setCenterPanelMode] = React.useState<CenterPanelMode>("frames")
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)

  const frames: FrameItem[] = BOARD_FRAMES[activeBoardId] ?? []
  const boardName = BOARD_NAMES[activeBoardId] ?? activeBoardId
  const activeFrameRow = activeFrameKey
    ? frames.find((f) => f.key === activeFrameKey) ?? null
    : null

  // Scroll-to-bottom ref (used when in frames + message mode)
  const bottomRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending, activeFrameKey, centerPanelMode])

  // ── Adapt DesignerMessage[] → AgentDialogueMessage[] ─────────────────────
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

  const addMessage = React.useCallback(
    (m: DesignerMessage) => setMessages((prev) => [...prev, m]),
    [setMessages],
  )

  // ── handleSend — preserved from DesignBoardFrameList ─────────────────────
  const handleSend = React.useCallback(
    async (_e: React.FormEvent, opts: { content: string }) => {
      const text = opts.content.trim()
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
        })) as {
          response: string
          draft?: { spec_json: unknown }
          dialog_id?: string
          session_id?: string
        }

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

        if (
          frameBlock !== undefined &&
          typeof frameBlock === "object" &&
          frameBlock !== null
        ) {
          const fullSpec = buildFullSpec(liveDomainFrame, frameKeyForKip, frameBlock)

          if (isDesignerDebug()) {
            const jsonKey = FRAME_TO_JSON_KEY[frameKeyForKip] ?? null
            const block = jsonKey
              ? (fullSpec as unknown as Record<string, unknown>)[jsonKey]
              : null
            console.log("[DesignBoard:debug] setDraftSpecJson", {
              frameKey: frameKeyForKip,
              fullSpecKeys: Object.keys(fullSpec as object),
              frameBlockKeys:
                block && typeof block === "object" ? Object.keys(block) : null,
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
          } catch (draftErr: unknown) {
            const msg =
              draftErr instanceof Error ? draftErr.message : "unknown error"
            console.error("[DesignBoardCenter] auto-create draft failed:", draftErr)
            setSendError(
              `Draft creation failed: ${msg}. The preview is shown but publish is unavailable.`,
            )
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to send message"
        setSendError(msg)
        addMessage({
          id: uid(),
          role: "kip",
          content: "Sorry, something went wrong. Please try again.",
        })
      } finally {
        setIsSending(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      domainId,
      isSending,
      centerPanelMode,
      activeFrameKey,
      messages,
      dialogId,
      liveDomainFrame,
      addMessage,
    ],
  )

  // ── Banner context ─────────────────────────────────────────────────────────
  const bannerContext: BannerContext = {
    primary: "Design",
    secondary: activeFrameRow?.name ?? boardName,
    ...(hasDraftSpec ? { prelude: "Draft in progress" } : {}),
    ...(activeFrameRow && !hasDraftSpec ? {} : {}),
  }

  // ── Composer disabled state ────────────────────────────────────────────────
  const composerDisabled =
    isSending ||
    !domainId ||
    (centerPanelMode === "frames" && !activeFrameKey)

  // ── Dialog content for Zone 2 ──────────────────────────────────────────────
  // We always pass dialogContent so we control Zone 2 completely.
  // This lets us embed the draft bar at the bottom of the message area.
  const dialogContent: React.ReactNode = (() => {
    if (centerPanelMode === "brief") {
      return (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 keeper-panel-scroll">
            {liveDomainFrame ? (
              <DomainBrief domainFrame={liveDomainFrame} />
            ) : (
              <div
                className="px-4 py-6 text-[13px]"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Loading domain brief…
              </div>
            )}
          </div>
          <DraftBar
            hasDraftSpec={hasDraftSpec}
            publishSuccess={publishSuccess}
            draftId={draftId}
            isPublishing={isPublishing}
            onPublish={onPublish}
          />
        </div>
      )
    }

    if (centerPanelMode === "code") {
      return (
        <div className="flex flex-col h-full min-h-0">
          <div
            className="flex-1 overflow-auto px-4 py-3 min-h-0"
            style={{ background: "hsl(var(--theme-surface-paper) / 0.6)" }}
          >
            <pre
              className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {liveDomainFrame
                ? JSON.stringify(liveDomainFrame, null, 2)
                : "// Domain frame not loaded yet"}
            </pre>
          </div>
          <DraftBar
            hasDraftSpec={hasDraftSpec}
            publishSuccess={publishSuccess}
            draftId={draftId}
            isPublishing={isPublishing}
            onPublish={onPublish}
          />
        </div>
      )
    }

    // frames mode — no frame selected: show frame list
    if (!activeFrameKey) {
      return (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 keeper-panel-scroll">
            <FrameListContent
              frames={frames}
              activeFrameKey={activeFrameKey}
              onSelectFrame={onSelectFrame}
              draftSpecJson={draftSpecJson}
              liveDomainFrame={liveDomainFrame}
            />
          </div>
          <DraftBar
            hasDraftSpec={hasDraftSpec}
            publishSuccess={publishSuccess}
            draftId={draftId}
            isPublishing={isPublishing}
            onPublish={onPublish}
          />
        </div>
      )
    }

    // frames mode — frame selected: show message thread
    return (
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto min-h-0 keeper-panel-scroll px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex min-h-[100px] items-center justify-center">
              <p
                className="text-center text-[13px] max-w-xs"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {`Tell Kip what you want to change about the ${activeFrameRow?.name ?? "frame"}.`}
              </p>
            </div>
          )}
          {messages.map((msg) => {
            const isUser = msg.role === "user"
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div
                  className="max-w-[80%] rounded-xl px-3 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    background: isUser
                      ? "hsl(var(--theme-ink-primary))"
                      : "hsl(var(--theme-surface-elevated))",
                    color: isUser
                      ? "hsl(var(--theme-surface-paper))"
                      : "hsl(var(--theme-ink-primary))",
                    border: isUser
                      ? "none"
                      : "1px solid hsl(var(--theme-border-soft) / 0.4)",
                  }}
                >
                  {!isUser && (
                    <p
                      className="mb-1 text-[10px] font-semibold uppercase tracking-widest"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      Kip
                    </p>
                  )}
                  <p style={{ whiteSpace: "pre-wrap" }}>{msg.content}</p>
                  {!!msg.draftProposal && (
                    <p
                      className="mt-1.5 text-[10px]"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      ↑ Draft proposal generated
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          {isSending && (
            <div className="flex justify-start">
              <div
                className="rounded-xl px-3 py-2.5 text-[13px] border"
                style={{
                  background: "hsl(var(--theme-surface-elevated))",
                  color: "hsl(var(--theme-ink-tertiary))",
                  borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                }}
              >
                <p
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  Kip
                </p>
                <p>Thinking…</p>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <DraftBar
          hasDraftSpec={hasDraftSpec}
          publishSuccess={publishSuccess}
          draftId={draftId}
          isPublishing={isPublishing}
          onPublish={onPublish}
        />
      </div>
    )
  })()

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Mode switcher + density switcher */}
      <ModeTabBar
        mode={centerPanelMode}
        onChange={(m) => {
          setCenterPanelMode(m)
          // Clear frame selection when switching away from frames mode
          if (m !== "frames") onClearFrameSelection()
        }}
        density={density}
        onDensityChange={onDensityChange}
      />

      {/* Frame rail — shown when a frame is active and in frames mode */}
      {centerPanelMode === "frames" && activeFrameKey && activeFrameRow && (
        <FrameRail
          frames={frames}
          activeFrameKey={activeFrameKey}
          onSelect={onSelectFrame}
        />
      )}

      {/* Send error */}
      {sendError && (
        <div
          className="shrink-0 px-4 py-2 text-[11px] font-medium"
          style={{
            background: "hsl(0 84% 60% / 0.1)",
            color: "hsl(0 84% 40%)",
            borderBottom: "1px solid hsl(0 84% 60% / 0.2)",
          }}
        >
          {sendError}
        </div>
      )}

      {/* KeeperDialogFrame — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <KeeperDialogFrame
          bannerContext={bannerContext}
          agentName="Design"
          agentId={null}
          domainId={domainId}
          dialogueMode="domain"
          messages={adaptedMessages}
          isSending={isSending}
          error={null}
          inputValue={input}
          onInputChange={setInput}
          onSubmit={handleSend}
          activeSessionId={null}
          disabled={composerDisabled}
          showServiceBar={false}
          dialogContent={dialogContent}
        />
      </div>
    </div>
  )
}
