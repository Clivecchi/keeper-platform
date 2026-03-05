"use client"

/**
 * CompanionSlide — SlideType: companion
 *
 * The public Kip surface. Triggered when a guest taps Kip in the InteractionBar.
 * Renders as a slide-up overlay. Not a frame navigation. Not the Agent Studio.
 *
 * Contains:
 *   - Kip's greeting (from domainFrame.kip.greeting)
 *   - Chat message bubbles
 *   - One text input and send button
 *   - Sign In button (guests only)
 *   - Nothing else
 *
 * Spec: Keeper JsonFrame Spec v0.1 · March 2026 — Step 4
 */

import * as React from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { KipApi } from "../../lib/kipApi"
import type { AudienceRole } from "../data/domain-frame.types"

interface CompanionMessage {
  id: string
  role: "kip" | "user"
  content: string
}

export interface CompanionSlideProps {
  isOpen: boolean
  onClose: () => void
  /** From domainFrame.kip.greeting */
  greeting: string
  audience: AudienceRole
  domainSlug: string
  /** From domainFrame.kip.agent_id */
  agentId: string
  onSignIn: () => void
}

export function CompanionSlide({
  isOpen,
  onClose,
  greeting,
  audience,
  domainSlug,
  agentId,
  onSignIn,
}: CompanionSlideProps) {
  const [messages, setMessages] = React.useState<CompanionMessage[]>(() => [
    { id: "kip-greeting", role: "kip", content: greeting },
  ])
  const [inputValue, setInputValue] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [sessionId, setSessionId] = React.useState<string | null>(null)
  const [resolvedAgentId, setResolvedAgentId] = React.useState<string | null>(null)
  const [agentAuthRequired, setAgentAuthRequired] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const isGuest = audience === "guest"

  // Reset to greeting whenever the companion opens or greeting changes
  React.useEffect(() => {
    if (isOpen) {
      setMessages([{ id: "kip-greeting", role: "kip", content: greeting }])
      setSessionId(null)
      setInputValue("")
    }
  }, [isOpen, greeting])

  // Focus input on open
  React.useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Scroll to bottom on new messages
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isSending])

  // Try to resolve the agent — kip.visibility = "public" may allow guests
  React.useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    KipApi.getLeadAgent(agentId)
      .then((agent) => {
        if (cancelled) return
        setResolvedAgentId(agent.id)
        setAgentAuthRequired(false)
      })
      .catch((err) => {
        if (cancelled) return
        const status = (err as { status?: number })?.status
        setAgentAuthRequired(status === 401)
      })
    return () => { cancelled = true }
  }, [isOpen, agentId])

  const handleSend = async () => {
    const content = inputValue.trim()
    if (!content || isSending) return

    // If auth is required and agent hasn't resolved, soft-block with sign-in prompt
    if (agentAuthRequired || !resolvedAgentId) {
      setMessages((prev) => [
        ...prev,
        { id: `user-${Date.now()}`, role: "user", content },
        {
          id: `kip-auth-${Date.now()}`,
          role: "kip",
          content: "Sign in to continue chatting with me.",
        },
      ])
      setInputValue("")
      return
    }

    const optimisticId = `user-${Date.now()}`
    setMessages((prev) => [...prev, { id: optimisticId, role: "user", content }])
    setInputValue("")
    setIsSending(true)

    try {
      const result = await KipApi.runAgent(
        resolvedAgentId,
        content,
        undefined,
        sessionId ?? undefined,
        { domainSlug },
      )

      const returnedSessionId =
        (result as any)?.data?.data?.session_id ||
        (result as any)?.session_id ||
        null

      const activeSession = returnedSessionId || sessionId
      if (returnedSessionId && !sessionId) setSessionId(returnedSessionId)

      if (activeSession) {
        const sessionMessages = await KipApi.getSessionMessages(activeSession)
        setMessages([
          { id: "kip-greeting", role: "kip", content: greeting },
          ...sessionMessages.map((m) => ({
            id: m.id,
            role: ((m.sender || m.role) === "user" ? "user" : "kip") as "user" | "kip",
            content: m.content,
          })),
        ])
      }
    } catch (err) {
      const status = (err as { status?: number })?.status
      setMessages((prev) => [
        ...prev,
        {
          id: `kip-err-${Date.now()}`,
          role: "kip",
          content:
            status === 401
              ? "Sign in to continue chatting with me."
              : "Something went wrong. Please try again.",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl border-t shadow-2xl"
      style={{
        maxHeight: "72vh",
        backgroundColor: "hsl(var(--theme-surface-page) / 0.98)",
        borderColor: "var(--theme-border-soft)",
        backdropFilter: "blur(8px)",
      }}
      role="dialog"
      aria-label="Kip companion"
    >
      {/* Header — Kip name + close. Nothing else. */}
      <div
        className="flex items-center justify-between gap-2 px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: "var(--theme-border-soft)" }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-2 w-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#3C6FA5" }}
            aria-hidden
          />
          <span
            className="text-xs font-medium"
            style={{ color: "var(--theme-ink-primary)" }}
          >
            Kip
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 transition-colors hover:opacity-80"
          style={{ color: "var(--theme-ink-tertiary)" }}
          aria-label="Close Kip"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
              style={
                msg.role === "kip"
                  ? {
                      backgroundColor: "hsl(var(--theme-surface-panel) / 0.9)",
                      color: "var(--theme-ink-primary)",
                      borderBottomLeftRadius: "4px",
                    }
                  : {
                      backgroundColor: "#2d6a7f",
                      color: "#fff",
                      borderBottomRightRadius: "4px",
                    }
              }
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div
              className="rounded-2xl px-4 py-2.5 text-sm"
              style={{
                backgroundColor: "hsl(var(--theme-surface-panel) / 0.9)",
                color: "var(--theme-ink-tertiary)",
                borderBottomLeftRadius: "4px",
              }}
            >
              …
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input row + Sign In */}
      <div
        className="border-t px-3 pt-3 pb-4 space-y-2 flex-shrink-0"
        style={{ borderColor: "var(--theme-border-soft)" }}
      >
        <form
          onSubmit={(e) => { e.preventDefault(); void handleSend() }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Message Kip…"
            className="flex-1 rounded-full border px-4 py-2 text-sm outline-none transition-colors"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
              color: "var(--theme-ink-primary)",
            }}
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="rounded-full border px-4 py-2 text-xs font-medium transition-colors hover:opacity-90 disabled:opacity-40"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.9)",
              color: "var(--theme-ink-primary)",
            }}
          >
            Send
          </button>
        </form>

        {/* Sign In — guests only */}
        {isGuest && (
          <button
            type="button"
            onClick={onSignIn}
            className="w-full rounded-full border py-2 text-xs font-medium transition-colors hover:opacity-90"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "transparent",
              color: "var(--theme-ink-secondary)",
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  )
}
