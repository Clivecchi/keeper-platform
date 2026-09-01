# Keeper UI Experience: Surfaces, Engagement, Infrastructure

This document is the canonical, code-backed description of Keeper's user experience surfaces, engagement actions, and the infrastructure that drives UI behavior across the platform. It aligns narrative UX language with runtime components and pipelines.

## 📌 Source of Truth

- **Shell + frames**: `apps/web/src/v0/shell/V0Shell.tsx`, `apps/web/src/v0/shell/V0ShellContext.tsx`, `apps/web/src/v0/shell/useExperienceMode.ts`.
- **Universal Board**: `apps/web/src/v0/boards/UniversalBoard.tsx`, `UniversalNavPanel.tsx`, `panels/UniversalViewPanel.tsx` (Chronicle), `UniversalBoardContext.tsx`, `engagement/ChronicleEngagementSurface.tsx`.
- **Declared Chronicle UI**: `apps/web/src/v0/presence/chronicleConfig/ChronicleConfigShell.tsx`, `ChronicleActPresence.tsx`, `useChronicleConfig.ts`.
- **World renderers**: `apps/web/src/worlds/shared/BoardRenderer.tsx`, `apps/web/src/worlds/presentation/NarrativeFrameRenderer.tsx`, `apps/web/src/worlds/workshop/StructuralFrameRenderer.tsx`.
- **Routing + layouts**: `apps/web/src/App.tsx`, `apps/web/src/pages/d/V0ShellPage.tsx`, `apps/web/src/layouts/BoardPublicLayout.tsx`.
- **UX modes**: `apps/web/src/context/WorldModeContext.tsx`, `apps/web/src/context/ViewModeContext.tsx`.
- **Engagement pipeline**: `packages/database/prisma/schema.prisma`, `apps/api/src/services/EngagementTemplateExecutor.ts`, `apps/api/src/api/engagement/execute.ts`, `apps/web/src/lib/engagement/submit.ts`, `apps/web/src/components/engagement/EngagementForm.tsx`, `apps/web/src/components/engagement/EntityEngagementBar.tsx`.

## 🧭 Experience Surfaces

Keeper UI is composed as a frame-based experience rendered by a single shell and tuned by contextual modes.

### Shell + Frames

- **Shell** is the runtime container that selects a frame and derives ExperienceMode.
- **Frames** are the primary surfaces (e.g., cover, index, moment, commons, present, admin).
- Frame routing is driven by URL, auth, and frame state flags.

### Singular UI (member vs public)

| Audience | Canonical URL | Surface | Wire features here |
|---|---|---|---|
| **Member (auth)** | `/d/:slug?board=domain` (or `build` / `agent` / `designer`) | Universal Board: Nav · Dialog · Chronicle | `UniversalNavPanel`, `KeeperPresence` / Chronicle |
| **Guest / public story** | Present (target) · Cover today | Narrative read-only — not standalone journey frames | `PresentFrame` — after board engagement |
| **Legacy frames** | `?frame=journeys`, `?frame=keepers`, etc. | Standalone v0 frames | **Do not extend for Phase 1 member work.** |

Authenticated users with no query params redirect to `?board=domain` (see `V0Shell.tsx`). Test member features at `?board=domain`, never `?frame=journeys`.

### Universal Board — Nav · Dialog · Chronicle

The member workspace is a three-panel board, not a standalone frame route.

**Locked pathway (2026-08-18):** Nav selects the subject. When the subject is a Dialog — or belongs to one — Dialog is that conversation. Chronicle renders the subject’s most relevant body: Document for a Dialog, glossary markdown for Glossary, cover + blocks for an EntityKind. Agent context must be that same body, or the agent must say it does not have it. No third object.

| Panel | Runtime | Role |
|---|---|---|
| **Nav** | `UniversalNavPanel` | Three panes — **Universal** (Dialog, Draft, Chatter, Library link), **Keepers** (Keeper, Journeys, Moment), **Config** (board-specific: integrations, keys, agents, glossary, …). List records, select focus, `+` trigger. Fetch, collapse, label. **Never** host engagement forms, Acts, or Config save UI. Library opens a screen over Dialog; the selected item renders in Chronicle. |
| **Dialog** | `UniversalConversation` | Conversation for the focused Dialog (or the Dialog that owns the subject). Selecting a Dialog in Nav resumes that Dialog’s session — banner, thread, and Chronicle become one room. |
| **Chronicle** | `UniversalViewPanel` → DocumentShell / `KeeperPresence` | Most relevant body of the object in focus. Focused Dialog → Document (`DocumentShell`), not a session dump. |

**Declared UI — one Chronicle shell family:**
- **Focus** — `EntityCoverPresence` + declaration blocks (`KeeperPresence`)
- **Config / Manage** — `ChronicleConfigShell` + `keeper-presence-field-label` fields + Save bar (`AgentConfigPresence`, `KeyConfigPresence`, etc.)
- **Act (engagement create)** — same `ChronicleConfigShell` + declared fields + Submit bar (`ChronicleActPresence`) — **not** generic `EngagementForm` chrome

**Nav triggers, Chronicle renders.** When Nav `+` (or a Chronicle action bar) starts an engagement, Nav calls `requestChronicleEngagement` on `UniversalBoardContext`. Chronicle renders `ChronicleActPresence` through the declared shell. On submit or cancel, Chronicle returns to the current presence focus.

EntityKind cover/body/Config patterns (Key, Agent, Integration) follow the same split: Nav lists and labels; Chronicle owns cover, declaration blocks, and save. See `docs/entitykind-implementation-recipe.md`.

### Stage room (viewstate on the Board — 2026-08-30)

Stage is a room on the current Board (`workspaceSurface: 'dialog' | 'stage'`). It is **not** `?board=stage`, not a fourth panel, and not a Prisma Stage table until a second named Stage exists. First name: **Keeper Stage**.

Two things named Stage:

| Thing | What it is |
|---|---|
| **Viewstate** | How you look — Dialog conversation vs Stage workspace. Nav **Open Stage**. |
| **Named Stage** | Titled composition of real object references (`Domain.settings.keeperStage`). One Stage, many Dialogs. |

**Split (2026-08-30, Chuck):** Stage is the **room / screen**. The **story in development** is the single filmstrip told on that screen — not the Stage itself. Agents lay that story out (`stage.story.layout` writes `keeperStage.story`). Chronicle Document = Points for discussion. **Kept** lifts hierarchy weight (Keeper, Journey, Path, Moment) off the Document. **Presented** begins on Stage. A Slide is a presentation of a Point, a Moment, a Path, a Keeper, or a live beat. Do not invent a Prisma Story table until a second named Story exists.

**Forward motion (2026-08-30):** Domain presentations. Root is the Cover (`domain_cover` — wordmark, tagline, Forward). That is the frame that loads with the domain, not a `text_slide` title. Forward opens the **selected story**. On Stage, that is the filmstrip after Root. On public Cover, that is Present (first public journey today; Stage story when Present can play it). Browse journeys is not Forward.

**Filmstrip:** Root first. Story beats after. Each cell is a standalone engagement — media field + paper card, as the public Cover dresses. Theatre plays the current cell. Objects stay in Reach / Chronicle, not Composer.

**Reading plane (2026-08-31):** Paper cards on atmosphere use cream paper + dark ink (`surface.reading` / `.theme-reading-plane`). Board chrome stays Warm Dark. Stage theme inherits the domain; imagery can grow a Stage look (`keeperStage.theme`). Composer toolbar groups Look · Reach · Capture · Send. Theme opens Chronicle, same as Reach.

### World Mode (Presentation vs Workshop)

- **Presentation** renders narrative-first surfaces (story-first, read-only, no editing chrome).
- **Workshop** renders structural surfaces (editing tools, layouts, operational chrome).
- World mode controls which renderer is used by board routes.

### View Mode (Audience/Role Lens)

- **Architect / My Keeper / Admin** determines sidebar navigation and surface affordances.
- View mode is stored and restored via client state for consistent UX.

### Workspace Modes (Commons)

- Commons emphasizes workspace stance shifts like observe, focus, build, reflect.
- These modes tune layout, cards, and UI pacing without changing ExperienceMode.

## ⚙️ Engagement Templates + Actions

Engagement is a template-driven action system that enables interaction without breaking story.

### Template Contract

- Templates define: label, type, targetType, fields, visibility, and endpoint behavior.
- Fields specify input types and validation, ensuring stable client/UI rendering.
- Seeded Journey/Path/Moment templates: `packages/database/prisma/seeds/journey-path-moment-engagement-templates.seed.ts` (`journey.create`, `journey.addMoment`, `path.create`, `moment.create`, `moment.update`).

### Execution Pipeline

1. UI renders an action affordance (button, `+`, or action bar) for a template.
2. Client fetches the template (`GET /api/engagement/templates/:slug`) and renders fields if required.
3. Client submits via a single execution endpoint (`POST /api/engagement/execute`).
4. API validates, resolves permissions, and executes via `EngagementTemplateExecutor`.
5. Client receives a standardized success/error response; board context bumps nav revision or refreshes presence.

### Board Engagement Routing

On Universal Board, engagement follows a strict panel contract:

| Step | Where | What |
|---|---|---|
| Trigger | Nav `+` or Chronicle action bar (`EntityEngagementBar`) | User requests an Act |
| Request | `UniversalBoardContext.requestChronicleEngagement(slug, context)` | Sets `chronicleEngagement` intent |
| Render | `UniversalViewPanel` → `ChronicleActPresence` | Declared shell — same as Manage; Act header + themed form in Chronicle |
| Inline (journey focus) | `JourneyFocusPresence` cover actions → Act mode | `ChronicleActPresence` inside focus (same as Agent Configure flow) |
| Inline (moment focus) | `KeeperPresence` → `PresenceEngagementActions` | Moment update — migrate to cover Act pattern next |
| Complete | Submit or cancel | `closeChronicleEngagement`, `bumpJourneyNav`, presence refresh |

**Do not** render `EngagementForm` or `BoardEngagementForm` inside `UniversalNavPanel`. Nav is a narrow list surface; forms belong in Chronicle.

### UX Affordances

- **EngagementButton** — canonical trigger on standalone/narrative surfaces.
- **EntityEngagementBar** — KeeperType action bar on Chronicle presence (journey, moment focus).
- **ChronicleActPresence** — template-driven Acts through `ChronicleConfigShell` (matches Agent Manage)
- **EngagementForm** — legacy/generic form component; do not use for Universal Board Chronicle Acts
- Actions are surface-local and should not steal narrative focus — on board, that means Chronicle, not Nav.

## 🧱 UX Infrastructure

### Routing + Layout

- `App.tsx` defines public, authenticated, and board routes.
- Board routes (`/d/:slug?board=*`) route into `V0ShellPage` and the Universal Board shell.
- Public boards use minimal layout chrome to preserve narrative flow.

### Shell Registry + Context

- `V0ShellContext` defines frame keys and routing helpers.
- `V0Shell` manages frame registry, selection, and experience derivation.
- `UniversalBoardContext` shares selection state and engagement intent across Nav, Dialog, and Chronicle.

### Styling + Theming

- Themes and style overrides centralize visual identity per surface.
- World renderers own large-scale tone (narrative vs structural).
- Board Chronicle fields use `keeper-presence-field-label` + `hsl(var(--theme-*))` tokens via `ChronicleActPresence` / `ChronicleConfigShell` — not generic `EngagementForm` chrome.

## 🔗 Narrative UX → Runtime Mapping

- **Place / Space** → Frame + Shell selection, or Universal Board (`?board=*`) for members.
- **Present** → Presentation world renderer + Present frame (public singular UI — Phase B). Member **Stage** is the workshop that composes Frames from placed assets; Present is the guest/read of that story.
- **Act** → Engagement template action (button / form in **Chronicle**, never Nav).
- **Studio / Workshop** → Workshop world renderer and editing chrome.
- **Commons** → Commons frame with workspace modes.

## 🧭 Path Forward

- **Present engagement**: Wire public singular UI after board Nav + Chronicle engagement is complete.
- **Keep language layered**: Narrative terms (place/act/present) stay distinct from runtime keys (frame/world/mode/board).
- **Enforce single action pipeline**: All UI actions should remain template-driven to preserve integrity.
- **Clarify non-web surfaces**: Inventory any non-web UX surfaces that should be mapped here. // TODO: Verify and describe assumptions.

## 🛠️ How to Extend Safely

### Add a new surface (frame)
1. Add the frame key to `V0FrameKey` in `apps/web/src/v0/shell/V0ShellContext.tsx`.
2. Register the frame component in `V0Shell.tsx`.
3. If it affects experience mode, update `useExperienceMode.ts`.

### Add a new engagement template (member board)
1. Add records to `engagement_templates` and `engagement_fields` in Prisma; seed if Journey/Path/Moment family.
2. Ensure `EngagementTemplateExecutor` supports the config/visibility.
3. **Nav trigger only** — wire `+` or list affordance to `requestChronicleEngagement(slug, context)`; do not mount a form in Nav.
4. **Chronicle render** — `ChronicleActPresence` (declared `ChronicleConfigShell`); not generic `EngagementForm`.
5. On success, bump the relevant nav revision (`bumpJourneyNav`, etc.) or refresh `KeeperPresence`.
6. Test at `/d/:slug?board=domain`, not `?frame=*`.

### Add a new engagement template (narrative / public)
1. Same Prisma + executor steps as above.
2. Render via `EngagementButton` + template fetch helpers on the target frame (Present, Cover, etc.).

## 📆 Update Log

- **2026-08-30** — Stage room: Workspace-on-Stage is a Frame-driven story from placed assets, wrapped in Config. Chronicle Points stay discussion. Present stays guest/read. Now is the first beat. Not `?board=stage`.
- **2026-08-18** — Locked Nav · Dialog · Chronicle pathway: Nav selects the subject; Dialog is that conversation; Chronicle + agent context share the same body (Document for a Dialog). Selecting a Dialog resumes its session; `dialog.read { id }` returns that Document. Echo / Kip support stays offstage unless it has substance. `glossary.read` is the live Object Glossary — not a draft husk.
- **2026-06-19** — Declared Chronicle Act surface: `ChronicleActPresence` uses `ChronicleConfigShell` (same as Agent Manage); engagement forms must not bypass declared UI.
- **2026-02-01** — Initial canonical UI experience doc (surfaces, engagement pipeline, narrative mapping).
