"use client"

import * as React from "react"
import type { AudienceRole, DomainFrameCoverChatInterface } from "../../data/domain-frame.types"
import { getApiBase } from "../../../lib/apiFetch"
import { issueGuestHandoffKey } from "../../../lib/kipGuestHandoff"
import { useComposerDraftAutosave } from "../../../hooks/useComposerDraftAutosave"

export interface CoverChatInterfaceProps {
  chat_interface: DomainFrameCoverChatInterface
  domainSlug: string
  /** From `V0ShellContext.resolvedAudience` — never re-resolved here. */
  audience: AudienceRole | null
}

/** Merge partial JSON with safe defaults for gating. */
export function mergeCoverChatInterface(
  raw: DomainFrameCoverChatInterface | undefined,
): DomainFrameCoverChatInterface {
  return {
    enabled: false,
    available_to: [],
    ...raw,
  }
}

export function CoverChatInterface({ chat_interface, domainSlug, audience }: CoverChatInterfaceProps) {
  const {
    label,
    enabled,
    position,
    placeholder,
    available_to,
    submit_label: submitLabel,
  } = chat_interface

  void position

  const [inputValue, setInputValue] = React.useState("")
  const [items, setItems] = React.useState<{ role: "user" | "kip"; content: string; id: string }[]>([])
  const [isSending, setIsSending] = React.useState(false)
  const [companionSessionId, setCompanionSessionId] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const { clearSavedDraft, restoreSavedDraft } = useComposerDraftAutosave({
    scope: {
      domainSlug,
      board: "cover",
      agentId: "kip",
      sessionId: companionSessionId,
    },
    input: inputValue,
    setInput: setInputValue,
    isSending,
  })

  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 96)}px`
  }, [inputValue])

  if (!enabled || !audience || !available_to.includes(audience)) {
    return null
  }

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || isSending) return

    const ts = Date.now()
    const thinkingId = `kip-thinking-${ts}`

    const history = items
      .filter((b) => b.content !== "Kip is thinking\u2026")
      .slice(-6)
      .map((b) => ({
        role: (b.role === "kip" ? "assistant" : "user") as "assistant" | "user",
        content: b.content,
      }))

    setItems((prev) => [
      ...prev,
      { id: `user-${ts}`, role: "user", content: text },
      { id: thinkingId, role: "kip", content: "Kip is thinking\u2026" },
    ])
    setInputValue("")
    setIsSending(true)

    try {
      const response = await fetch(`${getApiBase()}/api/kip/companion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          domainSlug,
          conversationHistory: history,
          ...(companionSessionId ? { sessionId: companionSessionId } : {}),
        }),
      })

      const data = await response.json().catch(() => null)

      let reply: string
      if (response.status === 429) {
        reply = "Kip needs a moment. Try again shortly."
      } else if (response.ok && data?.success && typeof data.reply === "string") {
        reply = data.reply
      } else {
        reply = "Something went wrong. Try again."
      }

      const sid =
        response.ok && typeof data?.sessionId === "string" ? data.sessionId : null
      const did =
        response.ok && typeof data?.domainId === "string" ? data.domainId : null
      if (sid) setCompanionSessionId(sid)
      if (did && sid) void issueGuestHandoffKey(did, sid)

      setItems((prev) =>
        prev.map((item) =>
          item.id === thinkingId ? { ...item, content: reply } : item,
        ),
      )
      clearSavedDraft()
    } catch {
      setItems((prev) =>
        prev.map((item) =>
          item.id === thinkingId ? { ...item, content: "Something went wrong. Try again." } : item,
        ),
      )
      restoreSavedDraft()
    } finally {
      setIsSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSend()
    }
  }

  return (
    <section
      aria-label={label ?? "Cover conversation"}
      className="mt-6 w-full max-w-md border-t pt-6 text-left"
      style={{ borderColor: "var(--theme-border-soft)" }}
    >
      {label ? (
        <p
          className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.14em]"
          style={{ color: "var(--theme-ink-tertiary)" }}
        >
          {label}
        </p>
      ) : null}

      {items.length > 0 && (
        <ul className="mb-3 max-h-40 space-y-2 overflow-y-auto text-sm">
          {items.map((m) => (
            <li
              key={m.id}
              className="rounded-md px-3 py-2"
              style={{
                backgroundColor:
                  m.role === "kip"
                    ? "hsl(var(--theme-surface-paper) / 0.85)"
                    : "hsl(var(--theme-surface-panel) / 0.6)",
                color: "var(--theme-ink-primary)",
              }}
            >
              <span className="sr-only">{m.role === "kip" ? "Kip" : "You"}: </span>
              {m.content}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Type a message\u2026"}
          rows={1}
          className="min-h-[40px] flex-1 resize-none rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
          style={{
            borderColor: "var(--theme-border-soft)",
            color: "var(--theme-ink-primary)",
          }}
        />
        <button
          type="button"
          onClick={() => void handleSend()}
          disabled={!inputValue.trim() || isSending}
          className="shrink-0 rounded-full border px-3 py-2 text-[11px] font-medium uppercase tracking-wide transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor: "var(--theme-border-soft)",
            backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
            color: "var(--theme-ink-primary)",
          }}
        >
          {isSending ? "\u2026" : submitLabel ?? "Send"}
        </button>
      </div>
    </section>
  )
}
