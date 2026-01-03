# Frame & Template Audit (apps/web)

_Last updated: 2026-01-02_

## 1) Template Inventory (UI list: Agent Cockpit, Domain Design Board, Inventory, Journey Progress, Quote, Story)

| Template Name | Where Defined (file path) | Frame Count (declared) | Frame IDs/Keys | Frame Component/Renderer used | Data Source | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Agent Cockpit | `apps/web/src/boards/templates/agent.template.ts` (phase 4) and legacy `apps/web/src/features/board-studio/templates/index.ts` | 3 (Dialogic, Agent Preview, Agent Settings) plus auto Cover/Settings; legacy registry has 2 | `dialogic`/`dialog`, `agent_preview`, `config_panel` (legacy registry uses same ids) | `DialogFrame` (`apps/web/src/components/frames/DialogFrame.tsx`), `AgentPreviewFrame` (`apps/web/src/components/frames/AgentPreviewFrame.tsx`), `ConfigPanelFrame` (`apps/web/src/components/frames/ConfigPanelFrame.tsx`) | Hardcoded TS templates (zod) | Partial | Names in code are “Agent Home Board”; uses placeholder props; no live data wiring shown. |
| Domain Design Board | `apps/web/src/boards/templates/domain.template.ts` (phase 4) and legacy `apps/web/src/features/board-studio/templates/index.ts` | 3 (People, Domain Overview, Activity Feed) in phase 4; legacy registry has 2 | `media_card`, `preview`, `activity_feed` | `MediaCardFrame`, `PreviewFrame`; `activity_feed` has no mapped renderer in `apps/web/src/components/frames/FrameRenderer.tsx` | Hardcoded TS templates (zod) | Partial / Broken | Activity Feed frame type is unmapped; runtime domain board renderer (`apps/web/src/components/domain/DomainBoardRenderer.tsx`) instead pulls live board data via `/api/domains/:id/board-data`. |
| Inventory | Not defined in apps/web | n/a | n/a | n/a | Templates list is fetched dynamically from `/api/board-data/templates` in `apps/web/src/pages/studio/board-studio-page.tsx`; no static template spec in repo | Missing | UI name likely backed by API/DB seed only; nothing to inventory in frontend code. |
| Journey Progress | `apps/web/src/boards/templates/journey.template.ts` | 3 (Journey Path, Resource Gallery, Progress Tracker) | `process_frame`, `media_card`, `dashboard` | `ProcessFrame`, `MediaCardFrame`; no renderer for `dashboard` frameType in `apps/web/src/components/frames/FrameRenderer.tsx` | Hardcoded TS template (zod) | Partial | Frame type `dashboard` is not mapped; Progress Tracker would fall to “Unknown Frame Type” fallback. |
| Quote | Not defined in apps/web | n/a | n/a | n/a | Only prop-level “quote” blocks exist; no template | Missing | UI name appears only in API-driven list (not present in codebase). |
| Story | Not defined in apps/web | n/a | n/a | n/a | Only story props (legacy) in `apps/web/src/features/board-studio/v0/types.ts`; no template | Missing | UI name appears only in API-driven list (not present in codebase). |

_Other templates present in code but not in the screenshot: People Board (`apps/web/src/boards/templates/people.template.ts`) and Custom (empty) in the legacy registry. BoardStudioPage also uses runtime templates returned from `/api/board-data/templates`, so the rendered list can diverge from the hardcoded registries above._

## 2) Frame Type Inventory

| Frame Type Key | Component Name | File Path | Props / Schema expectations (brief) | Where Used (templates/boards) | Status |
| --- | --- | --- | --- | --- | --- |
| media_card | MediaCardFrame | `apps/web/src/components/frames/MediaCardFrame.tsx` | Uses FrameContent (image/video/audio) playlist; no explicit schema | Agent/Domain/Journey/People templates; BoardRenderer fallback | Implemented |
| preview | PreviewFrame | `apps/web/src/components/frames/PreviewFrame.tsx` | Renders summary card; props via FrameContent | Domain/Journey board components and templates | Implemented |
| dialog | DialogFrame | `apps/web/src/components/frames/DialogFrame.tsx` | `agentId?` via `DialogPropsSchema` | Agent template; registry | Implemented |
| agent_preview | AgentPreviewFrame | `apps/web/src/components/frames/AgentPreviewFrame.tsx` | Displays agent metadata; props from FrameContent | Agent template | Implemented (static placeholder data) |
| config_panel | ConfigPanelFrame | `apps/web/src/components/frames/ConfigPanelFrame.tsx` | Tabs/forms; `agentId?` via `ConfigPropsSchema` | Agent template; board mocks | Implemented |
| process_frame | ProcessFrame | `apps/web/src/components/frames/ProcessFrame.tsx` | Stepper; expects ordered steps in FrameContent | Journey template; keeper-type board mock | Implemented |
| topics | TopicsFrame | `apps/web/src/components/frames/TopicsFrame.tsx` | `agentId?`, `filter.topicId?` (schema) | Agent board mock (`frameType: 'topics'`) | Implemented |
| draft | DraftFrame | `apps/web/src/components/frames/DraftFrame.tsx` | Agent draft management; no explicit schema | Agent board mock (`frameType: 'draft'`) | Implemented (legacy) |
| code_snippet | CodeSnippetFrame | `apps/web/src/components/frames/CodeSnippetFrame.tsx` | Displays code text; no dedicated schema | Not referenced by templates | Placeholder / unused |
| activity | ActivityFrameDefault | `apps/web/src/components/frames/activity-feed-frame.tsx` | `agentId?`, `topicId?` (schema key: `ActivityPropsSchema`) | Registered via `registerAllExistingFrames`; not referenced by templates | Implemented (unused) |
| tasks | TasksFrame | `apps/web/src/components/frames/TasksFrame.tsx` | `agentId?`, `topicId?` | Registry only | Implemented (unused) |
| memory | MemoryFrame | `apps/web/src/components/frames/MemoryFrame.tsx` | `agentId?`, `limit?` | Registry only | Implemented (unused) |
| config | ConfigPanelFrame | Same as `config_panel` | `agentId?` | Registry key (short form) | Implemented |
| drafts | DraftFrame | Same component as `draft`; registry key only | `agentId?`, `topicId?` | Registry only; FrameRenderer type union excludes `drafts` | Partial (key unused) |
| activity_feed | — (no mapping) | Declared in `apps/web/src/boards/templates/domain.template.ts` | n/a | Domain template frame | Broken (not routed by FrameRenderer) |
| directory | — (no mapping) | Declared in `apps/web/src/boards/templates/people.template.ts` | n/a | People template frame | Broken (no renderer key) |
| collaboration | — (no mapping) | Declared in `apps/web/src/boards/templates/people.template.ts` | n/a | People template frame | Broken (no renderer key) |
| dashboard | — (no mapping) | Declared in `apps/web/src/boards/templates/journey.template.ts` | n/a | Journey template frame | Broken (no renderer key) |

_Renderer registry sources: `apps/web/src/components/frames/registerFrames.ts` populates keys dialog/topics/drafts/tasks/config/activity/memory; `apps/web/src/components/frames/FrameRenderer.tsx` then falls back to a legacy map for media_card/preview/dialog/config_panel/process_frame/agent_preview/code_snippet/topics/draft. Template-only keys marked “Broken” never resolve to a component and render the “Unknown Frame Type” fallback._

## 3) Registry / Routing Trace

- Studio/Preview (v0): `apps/web/src/features/board-studio/v0/BoardStudio.tsx` uses `FrameRenderer` in `apps/web/src/features/board-studio/v0/components/FrameRenderer.tsx`, which hardcodes `frameType: 'media_card'` and delegates to `PatternRenderer` (`apps/web/src/features/board-studio/patterns/PatternRenderer.tsx`). PatternRenderer selects by `pattern` (focus/form/dialogic/wizard/gallery/canvas), special-cases `role === 'cover'`, and uses `PropManager` for edit mode; props are coerced between object/array formats.
- Runtime boards (Studio page & board pages): `BoardRenderer` (`apps/web/src/components/boards/BoardRenderer.tsx`) hands each frame to `apps/web/src/components/frames/FrameRenderer.tsx`. FrameRenderer first checks the registry from `registerAllExistingFrames`, then applies entity-specific ID heuristics (domain/journey/keeper_type/people overrides), and finally a legacy map keyed by `frameType`. Unknown keys fall back to an “Unknown Frame Type” placeholder.
- Template application: `apps/web/src/boards/templates/index.ts` (`applyTemplate`) converts template entries into frame instances (with generated ids, frameType, pattern, props) before the above renderers consume them. Legacy registry `apps/web/src/features/board-studio/templates/index.ts` offers a smaller hardcoded set but is not wired into the new FrameRenderer.
- Data loading: The Studio page fetches template lists from `/api/board-data/templates` (`apps/web/src/pages/studio/board-studio-page.tsx`); domain board runtime fetches boards via `/api/domains/:id/board-data` (`apps/web/src/components/domain/DomainBoardRenderer.tsx`).

## 4) Current State Callouts

- Moment (Diary) Frame: Implemented only in the V0 surface as `MomentFrame` (`apps/web/src/v0/components/moment-frame.tsx`), toggled via `/v0?frame=moment` in `apps/web/src/pages/v0Page.tsx`. Not part of any board template or FrameRenderer registry.
- Board Cover Frame: Templates omit cover; BoardStudio assumes cover/settings are auto-created. PatternRenderer treats `frame.role === 'cover'` as a special FocusPattern (`apps/web/src/features/board-studio/patterns/PatternRenderer.tsx`). Separately, the V0 cover is a standalone component `CoverFrame` (`apps/web/src/v0/components/cover-frame.tsx`) rendered by `/v0` when `frame=cover`. No dedicated frameType exists for cover in the runtime FrameRenderer map.

