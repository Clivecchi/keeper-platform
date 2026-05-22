# v0/slides

## 📌 Purpose
SlideType components — the render vocabulary of the JSON UI Frame system. Each SlideType is a layout and behaviour contract for a Slide. New content = new JSON with a SlideType. Not new code.

## 🧱 Key Files
- `CompanionSlide.tsx` — SlideType: `companion`. Public Kip surface for guest visitors.
- `JourneyInvitationSlide.tsx` — SlideType: `journey_invitation`. Default cover card — wordmark, tagline, Forward CTA.

## 🔄 Data & Behavior
SlideTypes receive data from the domain frame JSON and the resolved audience role. They render from that data alone. No SlideType resolves audience independently or reads from a source other than its props.

**CompanionSlide** is triggered when a guest taps Kip in the InteractionBar. It:
- Renders as a corner-anchored floating panel (bottom-right, ~360×480px) — not a drawer
- Floats above the InteractionBar without pushing or overlaying main content
- Shows `domainFrame.kip.greeting` as Kip's first message (bubble)
- Renders two content types: Chat Bubbles and Cue Cards (structured responses with actions)
- Session state is never reset on close — conversation persists across open/close cycles
- Cue Cards auto-collapse after 4s; the Cue Cards icon appears in the header after the first card collapses
- Cue Cards view lists all received cards; a back arrow returns to chat
- Sends messages to `POST /api/kip/companion` (public, no auth). Shows a "Kip is thinking…" bubble while awaiting response. Handles 429 and error states with user-friendly messages.

## ⚠️ Notes & ToDo
- [ ] Add remaining SlideTypes as steps 5–6 complete: `journey_invitation`, `domain_cover`, `moment_card`, `path_index`, `text_slide`, `admin_card`
- [ ] CompanionSlide: resolve `agentId` → display name via agent lookup
- [ ] Step 3 conflict noted: BottomBarRight has Sign In · Kip order (right cluster) — spec says Forward · Kip · Sign In. Address before v1.
- [ ] CompanionSlide CueCard actions: wire `auth.signin` and `companion.dismiss` once sign-in flow is built

## 📆 Update Log

### 2026-05-21 — jsonframe Steps 4–5
- CompanionSlide: `kipLabel` from `interaction_bar.labels.kip`; cue card `auth.signin` / `companion.dismiss` wired
- JourneyInvitationSlide: TODO for future card content schema fields

### 2026-03-27 — JourneyInvitationSlide loading state
- Optional `forwardDisabled` prop disables Forward while Cover resolves the first public journey.

### 2026-03-03 — Step 5: JourneyInvitationSlide
- Created `JourneyInvitationSlide.tsx` — SlideType: journey_invitation
- Wired into `CoverBody.renderClosedCover()`: checks `domainFrame.cover.card.type`, renders JourneyInvitationSlide when "journey_invitation"
- Wordmark, tagline, Forward label all read from domain frame JSON
- Forward button navigates to journeys frame (destination: "journey/default")
- Existing API-data fallback render preserved for domains without frame JSON

### 2026-03-05 — Companion Visual Build (KE3P March 2026 spec)
- Rewrote `CompanionSlide.tsx` — full visual rebuild per Companion Component (Visual Build) spec
- Changed layout: full-width bottom drawer → corner-anchored panel (fixed, bottom-right, 360×480px)
- Added Cue Card component with open/collapsed states, auto-collapse (4s), smooth height transition
- Added Cue Cards view (icon appears after first card collapses; back arrow returns to chat)
- Added three-icon header: Chat | Cue Cards (conditional) | × Close
- Session persistence: removed state reset on close — conversation survives open/close cycles
- Input area: textarea with Shift+Enter multiline support, italic placeholder, SEND label
- Visual build: static mock content only — no Kip API wiring
- Added `Outfit` and `Cormorant Garamond` fonts to `apps/web/index.html`

### 2026-03-06 — Companion Kip Wiring
- Wired `CompanionSlide.tsx` to `POST /api/kip/companion` (public endpoint, no auth)
- `handleSend` is now async; sends `{ message, domainSlug, conversationHistory }` (last 6 bubble turns)
- Added `isSending` state — Send button shows `…` and is disabled while a request is in flight
- Added thinking state: "Kip is thinking…" bubble appears immediately; replaced with reply on success
- Error states: 429 → "Kip needs a moment. Try again shortly." / other → "Something went wrong. Try again."
- No visual changes — Cue Cards, session persistence, layout all untouched

### 2026-03-03 — Step 4: Initial creation (JSON UI Frame build)
- Created `CompanionSlide.tsx` — companion SlideType for public Kip surface
- Wired into `Margin.tsx`: `audience === "guest"` → opens CompanionSlide, not AgentBoardFrame
- Greeting reads from `domainFrame.kip.greeting` via props
- Sign In button visible to guests only, routes to login
