# Cursor Prompt — Companion Component (Visual Build)
## KE3P · Keeper Platform · March 2026

---

## Context

This prompt builds the **Companion** — Kip's public-facing chat surface. It replaces the current full-width bottom drawer (`CompanionSlide.tsx`) with a corner-anchored panel that is discreet, warm, and consistent with the Keeper aesthetic.

**Do not touch:** the authenticated Agent Studio, the InteractionBar, the JSON frame architecture, or any backend endpoints. This is a frontend visual component only.

Read the existing `CompanionSlide.tsx` before writing anything. Understand what it currently does, then replace it.

---

## What the Companion Is

A quiet, bottom-right corner panel. Not a drawer. Not a takeover. The background and cover remain fully visible and interactive behind it. Kip is present when needed, out of the way when not.

It opens when a visitor taps **Kip** in the InteractionBar. It is the only chat surface for public (guest) visitors.

---

## Visual Specification

### Panel

- Anchored: bottom-right corner
- Width: ~360px (fixed)
- Height: ~480px max, smaller when less content
- Background: warm cream `#fdfaf4`
- Border: 1px solid `#e8e0d4`
- Shadow: soft, warm — `0 8px 32px rgba(26,26,26,0.12)`
- Border radius: 6px
- Does NOT push or overlay the main content — floats above it
- The cover card and background remain visible and usable behind it

### Header Bar

```
[ Kip ]                              [ 💬 ] [ 🗂 ] [ × ]
```

- Left: Agent name from domain JSON — `kip.agent_id` display name. Font: Outfit, 13px, weight 500, color `#888`
- Right: Three icon buttons
  - **Chat icon** — active view: streaming chat (bubbles + cue cards)
  - **Cue Cards icon** — cue cards listed view
  - **× close** — closes the companion. Does NOT clear the session.
- Header padding: 12px 16px
- Border bottom: 1px solid `#e8e0d4`

The **Cue Cards icon** is hidden until the first Cue Card has scrolled out of the immediate chat view. It appears naturally — not on load.

### Chat Area

- Scrollable
- Two content types render here: **Chat Bubbles** and **Cue Cards**
- Padding: 12px 16px
- Background: transparent (shows panel cream)

#### Chat Bubbles

Standard message bubbles. Kip on the left, visitor on the right.

- Kip bubble: background `#f0ebe2`, text `#1a1a1a`, font Outfit 13px, border-radius 4px 12px 12px 4px
- Visitor bubble: background `#2d6a7f`, text white, font Outfit 13px, border-radius 12px 4px 4px 12px
- No avatars. No timestamps unless hovered.

#### Cue Cards

A Cue Card is a structured response from Kip — richer than a bubble, with a title, content, and optional actions.

**Open state** (arrives open):
- White card, 1px border `#e8e0d4`, border-radius 4px
- Header row: title (Outfit 11px, uppercase, letter-spacing 0.08em, color `#888`) + chevron-down icon
- Content area: body text (Outfit 13px, `#333`, line-height 1.6) + optional action items
- Padding: 10px 14px

**Collapsed state** (fades to after ~4 seconds if no interaction):
- Only the header row remains visible
- Smooth height transition — not a snap
- Chevron rotates to indicate collapsed
- Tapping the header re-opens the card
- This is the "breadcrumb" state — visited, available, not intrusive

**Action items inside a Cue Card:**
- Rendered as small text links, not buttons — spaced horizontally
- Font: Outfit 11px, uppercase, letter-spacing 0.06em
- Color: `#2d6a7f` (blue) — hover underline
- Example: `SIGN IN TO SAVE    EXPLORE FIRST`
- These are driven by the card's `actions` array in JSON

**Cue Card arrival animation:**
- Slides in from bottom, fades in — subtle, not dramatic
- Auto-collapses after 4 seconds if the visitor hasn't interacted with it

### Cue Cards View

When the visitor taps the Cue Cards icon, the chat area switches to a listed view of all Cue Cards received in this session.

- List of collapsed cards, in order
- Each can be expanded by tapping
- A small back arrow returns to the Chat view
- No chat bubbles visible in this view — only cards

### Input Area

Always visible at the bottom of the panel.

- Placeholder: `"What's on your mind..."` — italic, color `#aaa`
- Font: Outfit 13px
- No border on the input field itself — just a top border separating it from the chat area
- `SEND` label on the right — Outfit 11px, uppercase, color `#2d6a7f`
- Pressing Enter sends. Shift+Enter for new line.
- Padding: 10px 16px

### Session Persistence

**Closing the companion does not clear the session.** The chat history is held in component state. Re-opening the companion restores the conversation exactly where it was.

This is a hard requirement. Do not reset state on close.

---

## Mock Content for Visual Build

Use this static content to build and verify the visual before wiring to Kip:

**Kip greeting bubble:**
> "Hello. What would you like to keep today?"

**Cue Card — "A Path Forward" (open on arrival, auto-collapses):**
```json
{
  "type": "cue_card",
  "title": "A Path Forward",
  "content": "The journey is yours to discover. I'm here if you need guidance.",
  "actions": [
    { "label": "Sign In to Save", "action": "auth.signin" },
    { "label": "Explore First", "action": "companion.dismiss" }
  ]
}
```

**Visitor bubble:**
> "Hey Kip, what's good?"

**Kip response bubble:**
> "Everything here is worth keeping. What are you working on?"

Build with this static content. Confirm the visual is correct before any Kip wiring.

---

## Brand Reference

| Element | Value |
|---|---|
| Primary color | `#2d6a7f` |
| Accent / gold | `#b8963e` |
| Background / cream | `#fdfaf4` |
| Dark text | `#1a1a1a` |
| Muted text | `#888888` |
| UI font | Outfit |
| Display font | Cormorant Garamond |

---

## Done When

1. Companion opens in the bottom-right corner when Kip is tapped — does not cover the cover card
2. Header shows agent name left, three icons right
3. Kip greeting bubble renders on open
4. Cue Card arrives open, auto-collapses after 4 seconds
5. Collapsed card shows only title + chevron — tap reopens
6. Cue Cards icon appears after first card collapses
7. Tapping Cue Cards icon switches to listed card view
8. Visitor can type and send (static echo response is fine for now)
9. Closing and reopening the companion restores the conversation
10. The cover and background are fully visible behind the companion at all times

---

## What Not to Build Here

- Kip API wiring — static mock content only for now
- Sign In flow — action labels render, tapping does nothing yet
- Public session persistence to database — state only
- Authentication — not in scope
- Any changes to the authenticated Agent Studio

---

## Report Back

When done, share:
1. File path of the new component
2. Screenshot or description of each done-when item confirmed
3. Any conflicts with existing component structure

This report comes back to Claude (claude.ai) before Kip wiring begins.

---

*KE3P · Companion Component · Visual Build Prompt · March 2026*