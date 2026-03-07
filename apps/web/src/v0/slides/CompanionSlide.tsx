"use client"

/**
 * CompanionSlide — SlideType: companion
 *
 * Corner-anchored floating panel (bottom-right, ~360×480px). The public Kip
 * surface for guest visitors. Replaces the full-width bottom drawer.
 *
 * Key behaviours:
 *   - Floats above the InteractionBar — does NOT push or overlay main content
 *   - Session state is NEVER reset on close — conversation persists
 *   - Cue Cards arrive open, auto-collapse after 4s if untouched
 *   - Cue Cards icon appears in the header only after the first card collapses
 *   - Visual build: static mock content — no Kip API wiring
 *
 * Spec: Companion Component (Visual Build) · KE3P March 2026
 */

import * as React from "react"
import type { AudienceRole } from "../data/domain-frame.types"
import { getApiBase } from "../../lib/apiFetch"

// ─── Brand ────────────────────────────────────────────────────────────────────

const B = {
  primary:   "#2d6a7f",
  cream:     "#fdfaf4",
  border:    "#e8e0d4",
  shadow:    "0 8px 32px rgba(26,26,26,0.12)",
  kipBubble: "#f0ebe2",
  inkDark:   "#1a1a1a",
  inkBody:   "#333333",
  inkMuted:  "#888888",
  font:      "Outfit, Inter, sans-serif",
} as const

// ─── Types ────────────────────────────────────────────────────────────────────

interface CueCardAction {
  label:  string
  action: string
}

interface CueCardData {
  id:      string
  title:   string
  content: string
  actions: CueCardAction[]
}

type ChatItem =
  | { kind: "bubble";   id: string; role: "kip" | "user"; content: string }
  | { kind: "cue_card"; id: string; data: CueCardData }

export interface CompanionSlideProps {
  isOpen:             boolean
  onClose:            () => void
  greeting:           string
  audience:           AudienceRole
  domainSlug:         string
  agentId:            string
  onSignIn:           () => void
  experienceContext?: Record<string, unknown>
}

// ─── Mock seed content (visual build) ─────────────────────────────────────────

const SEED_CUE_CARD: CueCardData = {
  id:      "cue-path-forward",
  title:   "A Path Forward",
  content: "The journey is yours to discover. I'm here if you need guidance.",
  actions: [
    { label: "Sign In to Save", action: "auth.signin" },
    { label: "Explore First",   action: "companion.dismiss" },
  ],
}

function buildSeedItems(greeting: string): ChatItem[] {
  return [
    { kind: "bubble",   id: "kip-greeting",  role: "kip",  content: greeting },
    { kind: "cue_card", id: SEED_CUE_CARD.id, data: SEED_CUE_CARD },
    { kind: "bubble",   id: "user-seed-1",   role: "user", content: "Hey Kip, what's good?" },
    { kind: "bubble",   id: "kip-seed-1",    role: "kip",  content: "Everything here is worth keeping. What are you working on?" },
  ]
}

// ─── Placeholder style injection ──────────────────────────────────────────────

const COMPANION_CSS = `
  .kip-companion-input::placeholder {
    color: #aaaaaa;
    font-style: italic;
  }
`

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function SvgChat({ active }: { active: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 3.5C2 2.67 2.67 2 3.5 2h9C13.33 2 14 2.67 14 3.5v7C14 11.33 13.33 12 12.5 12H5l-3 2V3.5z"
        stroke={active ? B.primary : B.inkMuted}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SvgCards({ active }: { active: boolean }) {
  const stroke = active ? B.primary : B.inkMuted
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <rect x="2" y="2.5" width="12" height="4"   rx="1" stroke={stroke} strokeWidth="1.25" />
      <rect x="2" y="9.5" width="12" height="4"   rx="1" stroke={stroke} strokeWidth="1.25" />
    </svg>
  )
}

function SvgClose() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M4 4L12 12M12 4L4 12" stroke={B.inkMuted} strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function SvgChevron({ down }: { down: boolean }) {
  return (
    <svg
      width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden
      style={{
        flexShrink: 0,
        transition: "transform 0.3s ease",
        transform: down ? "rotate(0deg)" : "rotate(-90deg)",
      }}
    >
      <path
        d="M3 5L7 9L11 5"
        stroke={B.inkMuted}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SvgBack() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M10 12L6 8L10 4"
        stroke={B.inkMuted}
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── IconBtn ──────────────────────────────────────────────────────────────────

function IconBtn({
  label, active, onClick, children,
}: {
  label: string
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: active ? 1 : 0.65,
        transition: "opacity 0.15s ease",
      }}
    >
      {children}
    </button>
  )
}

// ─── BubbleItem ───────────────────────────────────────────────────────────────

function BubbleItem({ role, content }: { role: "kip" | "user"; content: string }) {
  const isKip = role === "kip"
  return (
    <div style={{ display: "flex", justifyContent: isKip ? "flex-start" : "flex-end" }}>
      <div
        style={{
          fontFamily:      B.font,
          fontSize:        "13px",
          lineHeight:      1.5,
          padding:         "8px 12px",
          maxWidth:        "82%",
          backgroundColor: isKip ? B.kipBubble : B.primary,
          color:           isKip ? B.inkDark   : "#ffffff",
          borderRadius:    isKip ? "4px 12px 12px 4px" : "12px 4px 4px 12px",
        }}
      >
        {content}
      </div>
    </div>
  )
}

// ─── ActionLink ───────────────────────────────────────────────────────────────

function ActionLink({ label }: { label: string }) {
  const [hovered, setHovered] = React.useState(false)
  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:     "none",
        border:         "none",
        padding:        0,
        cursor:         "pointer",
        fontFamily:     B.font,
        fontSize:       "11px",
        fontWeight:     500,
        textTransform:  "uppercase",
        letterSpacing:  "0.06em",
        color:          B.primary,
        textDecoration: hovered ? "underline" : "none",
      }}
    >
      {label}
    </button>
  )
}

// ─── CueCardItem ──────────────────────────────────────────────────────────────

function CueCardItem({
  data,
  autoCollapse,
  onCollapsed,
  startOpen = true,
}: {
  data:          CueCardData
  autoCollapse:  boolean
  onCollapsed?:  () => void
  startOpen?:    boolean
}) {
  const [expanded,   setExpanded]   = React.useState(startOpen)
  const [interacted, setInteracted] = React.useState(false)
  const [visible,    setVisible]    = React.useState(false)

  // Card entrance: slide up + fade in
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Stable callback ref so the timeout dep array stays clean
  const onCollapsedRef = React.useRef(onCollapsed)
  React.useEffect(() => { onCollapsedRef.current = onCollapsed })

  // Auto-collapse after 4s if visitor hasn't interacted with this card
  React.useEffect(() => {
    if (!autoCollapse || interacted) return
    const t = setTimeout(() => {
      setExpanded(false)
      onCollapsedRef.current?.()
    }, 4000)
    return () => clearTimeout(t)
  }, [autoCollapse, interacted])

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border:          `1px solid ${B.border}`,
        borderRadius:    "4px",
        overflow:        "hidden",
        opacity:         visible ? 1 : 0,
        transform:       visible ? "translateY(0)" : "translateY(6px)",
        transition:      "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      {/* Header row — always visible, toggles the card */}
      <button
        type="button"
        onClick={() => { setInteracted(true); setExpanded((v) => !v) }}
        style={{
          width:          "100%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "10px 14px",
          background:     "none",
          border:         "none",
          cursor:         "pointer",
          fontFamily:     B.font,
          fontSize:       "11px",
          fontWeight:     500,
          textTransform:  "uppercase",
          letterSpacing:  "0.08em",
          color:          B.inkMuted,
          textAlign:      "left",
        }}
      >
        {data.title}
        <SvgChevron down={expanded} />
      </button>

      {/* Expandable body — smooth height transition */}
      <div
        style={{
          maxHeight:  expanded ? "200px" : "0px",
          overflow:   "hidden",
          transition: "max-height 0.35s ease",
        }}
      >
        <div style={{ padding: "0 14px 10px" }}>
          <p
            style={{
              fontFamily: B.font,
              fontSize:   "13px",
              color:      B.inkBody,
              lineHeight: 1.6,
              margin:     "0 0 8px",
            }}
          >
            {data.content}
          </p>
          {data.actions.length > 0 && (
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {data.actions.map((a) => (
                <ActionLink key={a.action} label={a.label} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CompanionSlide ───────────────────────────────────────────────────────────

export function CompanionSlide({
  isOpen,
  onClose,
  greeting,
  domainSlug,
}: CompanionSlideProps) {
  // State is never reset on close — session persists across open/close
  const [items,              setItems]              = React.useState<ChatItem[]>(() => buildSeedItems(greeting))
  const [inputValue,         setInputValue]         = React.useState("")
  const [view,               setView]               = React.useState<"chat" | "cards">("chat")
  const [firstCardCollapsed, setFirstCardCollapsed] = React.useState(false)
  const [panelVisible,       setPanelVisible]       = React.useState(false)
  const [isSending,          setIsSending]          = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef    = React.useRef<HTMLTextAreaElement>(null)

  // Panel entrance animation — double rAF ensures the browser has painted first
  React.useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() =>
        requestAnimationFrame(() => setPanelVisible(true))
      )
      return () => cancelAnimationFrame(id)
    } else {
      setPanelVisible(false)
    }
  }, [isOpen])

  // Focus input when companion opens
  React.useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => textareaRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  // Scroll to bottom when new items arrive in chat view
  React.useEffect(() => {
    if (view !== "chat") return
    const t = setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60)
    return () => clearTimeout(t)
  }, [items.length, view])

  // Textarea auto-resize (up to 80px)
  React.useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`
  }, [inputValue])

  const handleSend = async () => {
    const text = inputValue.trim()
    if (!text || isSending) return

    const ts         = Date.now()
    const thinkingId = `kip-thinking-${ts}`

    // Build prior conversation from current items before adding new messages
    const history = items
      .filter((i): i is Extract<ChatItem, { kind: "bubble" }> => i.kind === "bubble")
      .slice(-6)
      .map(b => ({
        role:    (b.role === "kip" ? "assistant" : "user") as "assistant" | "user",
        content: b.content,
      }))

    setItems(prev => [
      ...prev,
      { kind: "bubble", id: `user-${ts}`, role: "user", content: text },
      { kind: "bubble", id: thinkingId,   role: "kip",  content: "Kip is thinking\u2026" },
    ])
    setInputValue("")
    setIsSending(true)

    try {
      const response = await fetch(`${getApiBase()}/api/kip/companion`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: text, domainSlug, conversationHistory: history }),
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

      setItems(prev => prev.map(item =>
        item.id === thinkingId && item.kind === "bubble"
          ? { ...item, content: reply }
          : item
      ))
    } catch {
      setItems(prev => prev.map(item =>
        item.id === thinkingId && item.kind === "bubble"
          ? { ...item, content: "Something went wrong. Try again." }
          : item
      ))
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const cueCards = items.filter(
    (i): i is Extract<ChatItem, { kind: "cue_card" }> => i.kind === "cue_card"
  )

  // Keep component mounted always — do not unmount on close, state must survive
  return (
    <>
      <style>{COMPANION_CSS}</style>

      <div
        role="dialog"
        aria-label="Kip companion"
        aria-hidden={!isOpen}
        style={{
          position:        "fixed",
          bottom:          "88px",
          // Align to the right edge of the max-w-5xl (64rem) container shared by
          // the InteractionBar and the cover card — not the viewport edge.
          // On viewports narrower than 64rem the container fills the viewport
          // and the fallback 16px margin applies naturally.
          right:           "max(16px, calc((100vw - 64rem) / 2 + 16px))",
          width:           "360px",
          maxHeight:       "480px",
          backgroundColor: B.cream,
          border:          `1px solid ${B.border}`,
          boxShadow:       B.shadow,
          borderRadius:    "6px",
          display:         "flex",
          flexDirection:   "column",
          zIndex:          50,
          fontFamily:      B.font,
          overflow:        "hidden",
          // Visibility — hidden when closed but never unmounted
          pointerEvents:   isOpen ? "auto" : "none",
          opacity:         isOpen && panelVisible ? 1 : 0,
          transform:       isOpen && panelVisible ? "translateY(0)" : "translateY(10px)",
          transition:      isOpen
            ? "opacity 0.2s ease, transform 0.2s ease"
            : "opacity 0.15s ease, transform 0.15s ease",
        }}
      >
        {/* ── Header ── */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "12px 16px",
            borderBottom:   `1px solid ${B.border}`,
            flexShrink:     0,
          }}
        >
          {/* Left: agent name */}
          <span
            style={{
              fontFamily: B.font,
              fontSize:   "13px",
              fontWeight: 500,
              color:      B.inkMuted,
            }}
          >
            Kip
          </span>

          {/* Right: Chat icon · Cue Cards icon (conditional) · × */}
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <IconBtn label="Chat view" active={view === "chat"} onClick={() => setView("chat")}>
              <SvgChat active={view === "chat"} />
            </IconBtn>

            {/* Cue Cards icon — appears only after the first card has auto-collapsed */}
            {firstCardCollapsed && (
              <IconBtn label="Cue Cards" active={view === "cards"} onClick={() => setView("cards")}>
                <SvgCards active={view === "cards"} />
              </IconBtn>
            )}

            <IconBtn label="Close Kip" active={false} onClick={onClose}>
              <SvgClose />
            </IconBtn>
          </div>
        </div>

        {/* ── Chat / Cards body ── */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {view === "chat" ? (
            /* Chat view — bubbles + cue cards interleaved */
            <div
              style={{
                padding:       "12px 16px",
                display:       "flex",
                flexDirection: "column",
                gap:           "8px",
              }}
            >
              {items.map((item, idx) => {
                if (item.kind === "bubble") {
                  return <BubbleItem key={item.id} role={item.role} content={item.content} />
                }

                const isFirst = items.findIndex((i) => i.kind === "cue_card") === idx
                return (
                  <CueCardItem
                    key={item.id}
                    data={item.data}
                    autoCollapse={isFirst && !firstCardCollapsed}
                    onCollapsed={() => setFirstCardCollapsed(true)}
                  />
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            /* Cards view — listed collapsed cards */
            <div
              style={{
                padding:       "12px 16px",
                display:       "flex",
                flexDirection: "column",
                gap:           "8px",
              }}
            >
              <button
                type="button"
                onClick={() => setView("chat")}
                style={{
                  background: "none",
                  border:     "none",
                  cursor:     "pointer",
                  display:    "flex",
                  alignItems: "center",
                  gap:        "4px",
                  color:      B.inkMuted,
                  fontFamily: B.font,
                  fontSize:   "11px",
                  padding:    "0 0 2px",
                  marginBottom: "4px",
                }}
              >
                <SvgBack />
                Back to chat
              </button>

              {cueCards.length === 0 ? (
                <p
                  style={{
                    fontFamily: B.font,
                    fontSize:   "13px",
                    color:      B.inkMuted,
                    textAlign:  "center",
                    padding:    "24px 0",
                  }}
                >
                  No cards yet.
                </p>
              ) : (
                cueCards.map((item) => (
                  <CueCardItem
                    key={item.id}
                    data={item.data}
                    autoCollapse={false}
                    startOpen={false}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* ── Input area ── */}
        <div
          style={{
            borderTop:   `1px solid ${B.border}`,
            padding:     "10px 16px",
            flexShrink:  0,
            display:     "flex",
            alignItems:  "flex-end",
            gap:         "8px",
          }}
        >
          <textarea
            ref={textareaRef}
            className="kip-companion-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What's on your mind..."
            rows={1}
            style={{
              flex:       1,
              resize:     "none",
              border:     "none",
              background: "transparent",
              outline:    "none",
              fontFamily: B.font,
              fontSize:   "13px",
              color:      B.inkDark,
              lineHeight: 1.5,
              padding:    "2px 0",
              overflow:   "hidden",
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            style={{
              background:    "none",
              border:        "none",
              cursor:        inputValue.trim() && !isSending ? "pointer" : "default",
              fontFamily:    B.font,
              fontSize:      "11px",
              fontWeight:    500,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color:         inputValue.trim() && !isSending ? B.primary : "#aaaaaa",
              padding:       "2px 0",
              flexShrink:    0,
              transition:    "color 0.15s ease",
            }}
          >
            {isSending ? "…" : "Send"}
          </button>
        </div>
      </div>
    </>
  )
}
