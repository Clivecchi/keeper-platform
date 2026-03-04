# KE3P · JSON UI FRAME
## Specification · v0.1 · March 2026
*For: Kip (developer handoff) · Cursor · Chuck*

---

> *"One Frame. One JSON object. Two surfaces — UI and Kip. No hardcoded decisions."*

---

## What This Is

This document specifies the JSON UI Frame — the first Frame in the Keeper platform built entirely from a JSON object. No hardcoded layout decisions. No assumptions about content. The Frame receives a domain JSON object, resolves the audience role, and renders accordingly.

This Frame replaces the current public-facing UI. It is not a special case. It is the standard. Every future Frame follows this pattern.

> **Note:** This is the single most important build decision since the platform began. Get this right and cleanup becomes migration. Get it wrong and you have a third disconnected system.

---

## The Principle

> *"Frames Present Slides. Slides render from JSON. Kip reads the same JSON. One source. Two surfaces."*

Everything a visitor sees — the cover, the InteractionBar, the companion, the directions — is a rendering decision made by the Frame based on what the JSON says and who the visitor is. Nothing is hardcoded in the component.

| Before (current) | After (JSON UI Frame) |
|---|---|
| Layout decisions hardcoded in components | Layout decisions in domain JSON |
| Kip and UI read different sources | Kip and UI read the same JSON |
| Audience rules scattered across components | Audience rules in JSON — resolved once |
| New UI = new component | New UI = new JSON object |
| Kip cannot see what visitor sees | Kip reads exactly what visitor sees |

---

## The Domain JSON Object

This is the single object the Frame reads. It lives in the database per domain. It is fetched on load. The Frame renders from it. Kip reads it. Nothing else is needed.

```json
{
  "domain": "default",
  "keeper_type": "platform",

  "theme": {
    "wordmark": "KE3P",
    "tagline": "cryptically designed, wonderfully underfolded",
    "background": "/images/keeper-dawn.jpg",
    "colors": {
      "primary": "#2d6a7f",
      "accent": "#b8963e",
      "surface": "#fdfaf4"
    },
    "fonts": {
      "display": "Cormorant Garamond",
      "ui": "Outfit"
    }
  },

  "kip": {
    "agent_id": "kip-default",
    "model": "claude-sonnet-4-6",
    "visibility": "public",
    "greeting": "Hello. What would you like to keep today?"
  },

  "audience_roles": ["guest", "keeper", "admin"],

  "cover": {
    "slide_type": "domain_cover",
    "card": {
      "type": "journey_invitation",
      "available_to": ["guest", "keeper", "admin"]
    }
  },

  "forward": {
    "label": "Forward",
    "destination": "journey/default",
    "available_to": ["guest", "keeper", "admin"]
  },

  "directions": [
    {
      "label": "Journeys",
      "frame": "journeys",
      "available_to": ["keeper", "admin"]
    },
    {
      "label": "Sign In",
      "action": "auth.signin",
      "available_to": ["guest"]
    }
  ],

  "kip_context": {
    "guest": "A visitor exploring Keeper for the first time. Warm welcome. Offer Forward.",
    "keeper": "An authenticated keeper. Orient to their journeys and moments.",
    "admin": "Platform admin. Full context available."
  },

  "interaction_bar": {
    "primary": "forward",
    "secondary": ["kip"],
    "auth": {
      "guest": ["sign_in"],
      "keeper": [],
      "admin": ["settings"]
    }
  }
}
```

---

## Audience Resolution

The Frame resolves the visitor's audience role once, on load. Every rendering decision flows from that resolved role. This is the only place audience logic lives.

```
resolveAudience(authState, domain):
  if not authenticated   → "guest"
  if authenticated       → "keeper"
  if admin flag          → "admin"

// Resolved role is passed to:
//   — UI render (what to show)
//   — Kip environment (what Kip knows)
//   — InteractionBar (what actions appear)
//   — directions filter (what paths are available)
```

> **Rule:** Audience resolution happens once at the Frame level. No child component resolves audience independently.

---

## The Three States — One Frame

The Frame renders three distinct states based on audience role. Same component. Same JSON. Different render.

### State 1 — Guest (Public)

A logged-out visitor arrives. The domain cover loads. The card shows the journey invitation. Forward is prominent. Kip is present as a minimal companion — not a workspace.

| Element | Renders |
|---|---|
| Cover | Background image · Wordmark · Tagline · Journey invitation card |
| InteractionBar | Forward (primary) · Kip · Sign In |
| Kip surface | Minimal companion. Chat bubbles. Input. Sign In button. No workspace chrome. |
| What Kip knows | `kip_context["guest"]` — warm welcome, offer Forward |

### State 2 — Keeper (Authenticated)

A logged-in keeper arrives. The cover acknowledges them. Forward leads into their journeys. Kip knows their context — keeper name, active journeys, recent moments.

| Element | Renders |
|---|---|
| Cover | Background · Wordmark · Keeper's journey card (personalized) |
| InteractionBar | Forward (primary) · Kip · [no Sign In] |
| Kip surface | Companion with keeper context. Journeys, Moments, Drafts visible. |
| What Kip knows | `kip_context["keeper"]` + Session Context Object |

### State 3 — Admin

Platform admin arrives. Full context. Forward leads to admin frame. Kip has full domain visibility. Settings accessible.

| Element | Renders |
|---|---|
| Cover | Background · Wordmark · Admin card (domain status, quick actions) |
| InteractionBar | Forward · Kip · Settings |
| Kip surface | Full workspace. Icon View Switcher visible. |
| What Kip knows | `kip_context["admin"]` + full domain JSON |

---

## SlideTypes — The Render Vocabulary

A SlideType is the layout and behavior contract for a Slide. The Frame knows how to render each SlideType. New content = new JSON with a SlideType. Not new code.

| SlideType | What it renders | Used for |
|---|---|---|
| `domain_cover` | Background · Wordmark · Tagline · Card | Every domain's home surface |
| `journey_invitation` | Journey title · Editorial line · Forward CTA | Cover card — entry point to a Journey |
| `companion` | Minimal chat · Input · Auth option | Public Kip surface |
| `moment_card` | Media · Title · Tags · Engagement actions | A single Moment displayed |
| `path_index` | Section list · Path cards · Progress | Journey navigation |
| `text_slide` | Editorial text · Quote · Typography only | Story beats, transitions |
| `admin_card` | Status · Actions · Domain controls | Admin state cover card |

> **Rule:** Define a new SlideType only when a genuinely new layout pattern is needed — not for every variation in content. Content variation is handled by JSON values, not new SlideTypes.

---

## The Companion — Kip's Public Surface

This is the most immediate fix. The current public Kip view renders the full Agent Studio. That is wrong. The public surface is a companion — minimal, warm, purposeful.

### What the Companion Is

- A small, unobtrusive chat surface
- Triggered by tapping Kip in the InteractionBar
- Renders as an overlay or slide-up — not a full frame navigation
- Kip speaks first — reads `kip_context` from JSON
- One input field. Send. That's it.
- Sign In available as a button within the chat — not separate navigation

### What the Companion Is Not

- Not the Agent Studio
- Not a workspace
- Not session management
- Not model configuration
- Not anything a public visitor doesn't need

> **Visual reference:** The companion screenshot shared in session (Image 3) — minimal chat bubbles, input at bottom, nothing else visible.

---

## The InteractionBar

The bottom persistent bar. Brand story: *inner-action bar* — where inner intent becomes outward action. One bar. Three states. Driven by JSON.

| Audience | Bar Contents |
|---|---|
| Guest | Forward · Kip · Sign In |
| Keeper | Forward · Kip |
| Admin | Forward · Kip · Settings |

**Current issues to fix:**

- `Act` label → `Forward`
- `kip-old` button → remove
- Sign In should sit next to Forward — not at the far right
- Correct order: Forward · Kip · Sign In (guest) or Forward · Kip (keeper)

> **Rule:** InteractionBar button order and labels come from the JSON `interaction_bar` object. No hardcoded labels in the component.

---

## Build Sequence — Smallest to Largest

Build in this order. Each step is independently shippable. Do not skip ahead.

### Step 1 — The JSON object and the fetch

Create the domain JSON object for the default domain. Store it (database or static file for now). Write the fetch that loads it on Frame init. Confirm it arrives in the browser.

*Done when: `console.log` shows the full JSON object on page load.*

### Step 2 — Audience resolution

Write the `resolveAudience` function. Pass auth state in. Get role out. Log the resolved role. Confirm guest/keeper/admin resolve correctly in incognito vs logged-in.

*Done when: incognito → `"guest"`, logged in → `"keeper"`, admin account → `"admin"`.*

### Step 3 — The InteractionBar from JSON

Replace the current hardcoded InteractionBar with one that renders from the JSON `interaction_bar` object + resolved audience role. Forward label from JSON. Buttons from JSON. Order from JSON.

*Done when: Guest sees Forward · Kip · Sign In. Keeper sees Forward · Kip. Labels match JSON values.*

### Step 4 — The Companion SlideType

Build the `companion` SlideType component. Minimal chat. Kip greeting from `kip_context[audience]`. Input. Sign In button for guests. No workspace chrome.

*Done when: tapping Kip in the InteractionBar shows the companion, not the Agent Studio.*

### Step 5 — The Cover card from JSON

Replace the empty cover card with a render driven by the `cover.card` object in JSON. For now: `journey_invitation` SlideType showing the domain wordmark and a Forward CTA.

*Done when: Cover card shows content. Forward button works. Guest sees invitation. Keeper sees their context.*

### Step 6 — Kip reads the JSON

Pass the resolved experience context to Kip's environment — audience, forward, directions, `kip_context[audience]`, model. Kip now knows everything the UI knows.

*Done when: ask Kip "what model are you running?" and it answers correctly from JSON.*

> **After Step 6** the JSON UI Frame is functionally complete for v0. Everything beyond this is new SlideTypes and new JSON objects — not new architecture.

---

## What Not to Build in This Frame

- Icon View Switcher — comes with the authenticated workspace, not this Frame
- Session history sidebar — authenticated workspace only
- Cockpit / model configuration — admin and authenticated only
- 3D co-build — Phase 2
- Theme creation UI — Phase 1, separate surface
- Anything that requires a database write from a guest

> Every item above is real and will be built. None of them belong in this Frame's v0. Scope is the discipline.

---

## Handoff Note for Kip and Cursor

This spec describes what to build and in what order. It does not specify file names, component structure, or implementation details — those belong to the codebase review in Cursor.

**Before writing any code, Cursor should:**

- Confirm where the current cover Frame component lives
- Confirm where the InteractionBar (`Margin.tsx`) lives
- Confirm where the `AgentBoardFrame` renders for public visitors
- Confirm whether a domain JSON object already exists in any form

Then build Steps 1–6 in sequence. Each step is a pull request. Each step is tested in incognito before the next step begins.

> *"The goal is not a beautiful new UI. The goal is the first Frame that actually follows the architecture. Beauty follows from correctness."*

---

*KE3P · JSON UI Frame Spec · v0.1 · March 2026*