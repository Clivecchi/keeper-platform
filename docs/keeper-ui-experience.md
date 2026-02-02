 # Keeper UI Experience: Surfaces, Engagement, Infrastructure
 
 This document is the canonical, code-backed description of Keeper's user experience surfaces, engagement actions, and the infrastructure that drives UI behavior across the platform. It aligns narrative UX language with runtime components and pipelines.
 
 ## 📌 Source of Truth
 
 - **Shell + frames**: `apps/web/src/v0/shell/V0Shell.tsx`, `apps/web/src/v0/shell/V0ShellContext.tsx`, `apps/web/src/v0/shell/useExperienceMode.ts`.
 - **World renderers**: `apps/web/src/worlds/shared/BoardRenderer.tsx`, `apps/web/src/worlds/presentation/NarrativeFrameRenderer.tsx`, `apps/web/src/worlds/workshop/StructuralFrameRenderer.tsx`.
 - **Routing + layouts**: `apps/web/src/App.tsx`, `apps/web/src/pages/d/V0ShellPage.tsx`, `apps/web/src/layouts/BoardPublicLayout.tsx`.
 - **UX modes**: `apps/web/src/context/WorldModeContext.tsx`, `apps/web/src/context/ViewModeContext.tsx`.
 - **Engagement pipeline**: `packages/database/prisma/schema.prisma`, `apps/api/src/services/EngagementTemplateExecutor.ts`, `apps/api/src/api/engagement/execute.ts`, `apps/web/src/lib/engagement/submit.ts`, `apps/web/src/components/engagement/EngagementButton.tsx`.
 
 ## 🧭 Experience Surfaces
 
 Keeper UI is composed as a frame-based experience rendered by a single shell and tuned by contextual modes.
 
 ### Shell + Frames
 
 - **Shell** is the runtime container that selects a frame and derives ExperienceMode.
 - **Frames** are the primary surfaces (e.g., cover, index, moment, commons, present, admin).
 - Frame routing is driven by URL, auth, and frame state flags.
 
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
 
 ### Execution Pipeline
 
 1. UI renders an action affordance (button, modal, form) for a template.
 2. Client fetches the template and renders fields if required.
 3. Client submits via a single execution endpoint.
 4. API validates, resolves permissions, and executes the configured endpoint.
 5. Client receives a standardized success/error response.
 
 ### UX Affordances
 
 - **EngagementButton** is the canonical trigger UI.
 - **EngagementModal** and dynamic forms render field-driven input surfaces.
 - Actions are surface-local and should not steal narrative focus.
 
 ## 🧱 UX Infrastructure
 
 ### Routing + Layout
 
 - `App.tsx` defines public, authenticated, and board routes.
 - Board routes (`/d/:slug`) route into `V0ShellPage` and the frame system.
 - Public boards use minimal layout chrome to preserve narrative flow.
 
 ### Shell Registry + Context
 
 - `V0ShellContext` defines frame keys and routing helpers.
 - `V0Shell` manages frame registry, selection, and experience derivation.
 
 ### Styling + Theming
 
 - Themes and style overrides centralize visual identity per surface.
 - World renderers own large-scale tone (narrative vs structural).
 
 ## 🔗 Narrative UX → Runtime Mapping
 
 - **Place / Space** → Frame + Shell selection.
 - **Present** → Presentation world renderer + Present frame.
 - **Act** → Engagement template action (button/modal/form).
 - **Studio / Workshop** → Workshop world renderer and editing chrome.
 - **Commons** → Commons frame with workspace modes.
 
 ## 🧭 Path Forward
 
 - **Clarify non-web surfaces**: Inventory any non-web UX surfaces that should be mapped here. // TODO: Verify and describe assumptions.
 - **Keep language layered**: Narrative terms (place/act/present) stay distinct from runtime keys (frame/world/mode).
 - **Enforce single action pipeline**: All UI actions should remain template-driven to preserve integrity.
 
 ## 🛠️ How to Extend Safely
 
 ### Add a new surface (frame)
 1. Add the frame key to `V0FrameKey` in `apps/web/src/v0/shell/V0ShellContext.tsx`.
 2. Register the frame component in `V0Shell.tsx`.
 3. If it affects experience mode, update `useExperienceMode.ts`.
 
 ### Add a new engagement template
 1. Add records to `engagement_templates` and `engagement_fields` in Prisma.
 2. Ensure `EngagementTemplateExecutor` supports the config/visibility.
 3. Render in UI via `EngagementButton` + template fetch helpers.
 
