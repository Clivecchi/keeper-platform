"use client"

/**
 * DesignBoardCenter
 * =================
 * KE3P · Keeper Platform · Design Board — Center Panel
 *
 * Pure conversation shell. Kip in Design Mode.
 * Composer is anchored at bottom — identical to IDE, Agent, and Domain boards.
 * Frame selection is owned entirely by the left panel (UniversalSwitcherPanel).
 * Brief and Code views live in the right panel (DesignBoardFrameDetail tabs).
 *
 * API endpoint: POST /api/domains/:domainId/kip/designer — unchanged.
 *
 * CRITICAL RULES:
 * - All colors via hsl(var(--theme-*)) only. Zero hardcoded hex.
 * - agentName is always "Design" — never "Kip", never "Rendr".
 * - handleSend calls /api/domains/:domainId/kip/designer with dialog_board: "designer".
 */

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"
import type { DesignerMessage } from "./DesignBoard"
import { BOARD_FRAMES, BOARD_NAMES } from "./DesignBoardFrameList"
import type { FrameItem } from "./DesignBoardFrameList"
import { FRAME_DISPLAY_NAMES, FRAME_TO_JSON_KEY } from "../../shell/frameRegistryMap"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import { KeeperDialogFrame } from "../../components/dialog/KeeperDialogFrame"
import type { BannerContext } from "../../components/dialog/KeeperDialogFrame"
import type { AgentDialogueMessage } from "../../../components/agent/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DesignBoardCenterProps {
  domainId: string | null

  activeBoardId: string
  activeFrameKey: string | null

  liveDomainFrame: DomainFrameJson | null

  draftSpecJson: DomainFrameJson | null
  setDraftSpecJson: (spec: DomainFrameJson | null) => void
  hasDraftSpec: boolean
  isPublishing: boolean
  publishSuccess: boolean
  onPublish: () => void

  messages: DesignerMessage[]
  setMessages: React.Dispatch<React.SetStateAction<DesignerMessage[]>>
  draftId: string | null
  setDraftId: (id: string | null) => void
  dialogId: string | null
  setDialogId: (id: string | null) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Draft bar — single instance, above the conversation ──────────────────────

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
      className="shrink-0 px-4 py-2.5 border-b flex items-center justify-between gap-3"
      style={{
        borderColor: publishSuccess
          ? "hsl(152 69% 43% / 0.3)"
          : "hsl(38 92% 50% / 0.3)",
        background: publishSuccess
          ? "hsl(152 69% 43% / 0.08)"
          : "hsl(38 92% 50% / 0.08)",
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
            ? "Draft ready — review preview in the right panel, then publish"
            : "Edit staged — review preview in the right panel, then publish"}
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DesignBoardCenter({
  domainId,
  activeBoardId,
  activeFrameKey,
  liveDomainFrame,
  draftSpecJson: _draftSpecJson,
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
}: DesignBoardCenterProps) {
  const [input, setInput] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sendError, setSendError] = React.useState<string | null>(null)

  const frames: FrameItem[] = BOARD_FRAMES[activeBoardId] ?? []
  const boardName = BOARD_NAMES[activeBoardId] ?? activeBoardId
  const activeFrameRow = activeFrameKey
    ? frames.find((f) => f.key === activeFrameKey) ?? null
    : null

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

  // ── handleSend ────────────────────────────────────────────────────────────
  const handleSend = React.useCallback(
    async (_e: React.FormEvent, opts: { content: string }) => {
      const text = opts.content.trim()
      if (!text || !domainId || isSending || !activeFrameKey) return

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
          const fullSpec = buildFullSpec(liveDomainFrame, activeFrameKey, frameBlock)

          if (isDesignerDebug()) {
            const jsonKey = FRAME_TO_JSON_KEY[activeFrameKey] ?? null
            const block = jsonKey
              ? (fullSpec as unknown as Record<string, unknown>)[jsonKey]
              : null
            console.log("[DesignBoard:debug] setDraftSpecJson", {
              frameKey: activeFrameKey,
              fullSpecKeys: Object.keys(fullSpec as object),
              frameBlockKeys:
                block && typeof block === "object" ? Object.keys(block) : null,
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
    [
      domainId,
      isSending,
      activeFrameKey,
      messages,
      dialogId,
      liveDomainFrame,
      addMessage,
    ],
  )

  // ── Banner: Design · [frame name] when a frame is selected ────────────────
  const bannerContext: BannerContext = {
    primary: "Design",
    secondary: activeFrameRow?.name ?? boardName,
    ...(hasDraftSpec ? { prelude: "Draft in progress" } : {}),
  }

  // Composer is disabled until a frame is selected (nothing to design against)
  const composerDisabled = isSending || !domainId || !activeFrameKey

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* Draft status — single location, above the conversation banner */}
      <DraftBar
        hasDraftSpec={hasDraftSpec}
        publishSuccess={publishSuccess}
        draftId={draftId}
        isPublishing={isPublishing}
        onPublish={onPublish}
      />

      {/* Send error */}
      {sendError && (
        <div
          className="shrink-0 px-4 py-2 text-[11px] font-medium border-b"
          style={{
            background: "hsl(0 84% 60% / 0.08)",
            color: "hsl(0 84% 40%)",
            borderColor: "hsl(0 84% 60% / 0.2)",
          }}
        >
          {sendError}
        </div>
      )}

      {/* KeeperDialogFrame — fills remaining height, composer anchored at bottom */}
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
        />
      </div>
    </div>
  )
}
