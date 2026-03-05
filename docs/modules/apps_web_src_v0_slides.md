# v0/slides

## 📌 Purpose
SlideType components — the render vocabulary of the JSON UI Frame system. Each SlideType is a layout and behaviour contract for a Slide. New content = new JSON with a SlideType. Not new code.

## 🧱 Key Files
- `CompanionSlide.tsx` — SlideType: `companion`. Public Kip surface for guest visitors.
- `JourneyInvitationSlide.tsx` — SlideType: `journey_invitation`. Default cover card — wordmark, tagline, Forward CTA.

## 🔄 Data & Behavior
SlideTypes receive data from the domain frame JSON and the resolved audience role. They render from that data alone. No SlideType resolves audience independently or reads from a source other than its props.

**CompanionSlide** is triggered when a guest taps Kip in the InteractionBar. It:
- Renders as a fixed bottom overlay (not a frame navigation)
- Shows `domainFrame.kip.greeting` as Kip's first message
- Attempts live chat via `KipApi.runAgent`; degrades gracefully on 401
- Shows Sign In button for `audience === "guest"` only
- Has no workspace chrome, no cockpit, no session list

## ⚠️ Notes & ToDo
- [ ] Add remaining SlideTypes as steps 5–6 complete: `journey_invitation`, `domain_cover`, `moment_card`, `path_index`, `text_slide`, `admin_card`
- [ ] CompanionSlide chat: verify public agent endpoint allows unauthenticated access (kip.visibility = "public")
- [ ] Step 3 conflict noted: BottomBarRight has Sign In · Kip order (right cluster) — spec says Forward · Kip · Sign In. Address before v1.

## 📆 Update Log

### 2026-03-03 — Step 5: JourneyInvitationSlide
- Created `JourneyInvitationSlide.tsx` — SlideType: journey_invitation
- Wired into `CoverBody.renderClosedCover()`: checks `domainFrame.cover.card.type`, renders JourneyInvitationSlide when "journey_invitation"
- Wordmark, tagline, Forward label all read from domain frame JSON
- Forward button navigates to journeys frame (destination: "journey/default")
- Existing API-data fallback render preserved for domains without frame JSON

### 2026-03-03 — Step 4: Initial creation (JSON UI Frame build)
- Created `CompanionSlide.tsx` — companion SlideType for public Kip surface
- Wired into `Margin.tsx`: `audience === "guest"` → opens CompanionSlide, not AgentBoardFrame
- Greeting reads from `domainFrame.kip.greeting` via props
- Sign In button visible to guests only, routes to login
