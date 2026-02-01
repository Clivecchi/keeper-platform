# Keeper Heart + Mind: Canonical Architecture

This document is the canonical, code-backed description of Keeper's core data model and runtime behavior, paired with the narrative journeys that explain its purpose. It aligns narrative language with actual schema and production paths.

## 📌 Source of Truth

- **Data model**: Prisma schema is the canonical definition of Domain, Keeper, Journey, Path, and Moment relationships. Refer to `packages/database/prisma/schema.prisma`.
- **Experience runtime**: Experience mode derivation + frame routing live in the v0 shell: `apps/web/src/v0/shell/useExperienceMode.ts`, `apps/web/src/v0/shell/V0ShellContext.tsx`, and `apps/web/src/v0/shell/V0Shell.tsx`.
- **Engagement pipeline**: Templates are stored in Prisma and executed by the executor service; the web client submits via the engagement helper. Refer to `apps/api/src/services/EngagementTemplateExecutor.ts` and `apps/web/src/lib/engagement/submit.ts`.

## ❤️ Narrative / Heart (Three Journeys)

### Journey: Keeper — A Journey of What Is Worth Keeping (Heart)

**Opening — Arrival**

Keeper is not an app that stores things. Keeper is a place you arrive when something matters. It exists to help people notice, capture, and keep what is worthy of effort—across life, work, memory, and meaning. Not everything. Just the things that deserve to last.

Keeper treats stories, work, and memory as first‑class citizens. Not as files. Not as posts. As living artifacts that can be revisited, shared, and built upon. This Journey explains what Keeper is and why it exists.

**Path — What Keeper Is (and Is Not)**

Keeper is:

- A story‑first system for life and professional memory
- A calm environment designed for focus and reflection
- A domain‑scoped platform with clear ownership and boundaries
- A frame‑based experience, not a page‑based website
- A bridge between personal narrative, community, and practical work

Keeper is not:

- A social network chasing attention
- A productivity dashboard
- A content feed
- A generic note‑taking app

Keeper values continuity over velocity and clarity over cleverness.

**Path — Keepers: The Structural Heart**

A Keeper sits between Domain and Journey. Keepers are the structural heart of the system.

A Keeper:

- Lives within a Domain
- Holds purpose, memory, and continuity
- Contains one or more Journeys
- Can be accessed across Domains by the same person

This is what allows Keeper to function as a life‑and‑profession system rather than a single‑domain app. Keepers are not folders. They are enduring containers of stewardship.

**Path — Journeys, Paths, and Moments**

Journeys live on a Keeper. Journeys do not have chapters. They unfold through Paths. Paths organize progression. Moments accumulate into meaning. Moments are not posts. They are acknowledgments that something mattered.

**Closing — Return**

Keeper does not rush. It waits. When something happens that you don’t want to lose—a thought, a decision, a memory, a season—Keeper is where you bring it. And when you return later, it is still there.

### Journey: The Experience Architecture (Mind in Motion)

**Opening — Experience as Place**

Keeper is experienced as a set of calm places. Under the hood, those places are Frames composed by a single Shell and moved between by an Experience controller. Experience answers one question: where am I right now?

**Path — Experience, Frames, and State**

Experience is not content. It is placement.

- **Experience (conceptual)**: where you are in the experience (place/space)
- **Current v0 ExperienceMode**: derived at runtime as `publicStory | commons | kipFocus | admin`
- **Presentation world (Porch)**: narrative rendering mode used on `/d/:slug` routes in the main web app
- **Frame**: the surface rendered inside the shell (e.g., `cover`, `index`, `moment`, `moments`, `commons`, `kip`, `admin`)
- **Frame State**: open / closed / focused conditions

Experience derives from auth + route + frameKey (+ state flags).

Narrative language may refer to “places”; implementation uses modes and frames. These are intentionally not 1:1.

Human-facing narrative language may use terms like “place” or “space.” Technical implementation uses Experience modes and frame keys. These layers intentionally do not collapse into a single naming system.

**Path — Act and Movement**

Act is a label, not a system. It is a call‑to‑action that triggers an Experience transition—most often from `cover` into the story space. Act does not execute logic. It moves the user.

**Path — Present, Commons, and Index**

Present is a story‑first presentation surface. It may render Moments, but it is conceptually distinct from capture/edit frames and exists to preserve narrative flow without distraction. In the current web app, the closest implementation match is the Presentation world renderer (Porch) used on `/d/:slug` routes, which emphasizes narrative, read‑only rendering without editing chrome. Commons is a place‑first environment. Index is structured navigation. These are **frames/surfaces**, not experience modes.

### Journey: Engagement Forward (Participation Without Collapse)

**Opening — Intent**

Engagement exists to allow interaction without breaking story. It deepens Experience. It does not replace it.

**Path — Engagement Actions**

Engagement Actions are in‑frame affordances: button, toggle, form, upload. They answer: What can I do here?

**Path — Engagement Templates**

Engagement Templates are the canonical action contract. They define: who can act, what data is required, how validation occurs, which endpoint executes, and how success and failure are communicated. UI renders. Templates govern.

**Path — Execution Discipline**

All Engagement executes through a single pipeline. No shortcuts. No hidden logic. This is what keeps interaction safe, auditable, and coherent.

**Closing — Forward**

Engagement is how Keeper becomes participatory. But it will always remain subordinate to story. That is the constraint that keeps Keeper whole.

## 🧩 Implementation Notes (v0)

- In the current v0 shell, `ExperienceMode` is derived at runtime as `publicStory | commons | kipFocus | admin`. This reflects today’s implementation, not the full conceptual model of Experience.
- Frames like `cover`, `index`, and `moment` are **frame keys**, not modes.
- The main web app also has a separate **world mode** (`presentation` vs `workshop`) that is route‑derived and controls narrative vs builder rendering.
- The schema relationships are **one-to-many**: `Journey` and `Path` each have `Moment[]` (and `Journey` has `Path[]`). Use arrays in architecture diagrams and JSON.
- `domainId` on `Journey`, `Keeper`, and `Moment` is **optional** in the schema.

## 🧱 Canonical Data Model (from Prisma)

- **Domain** owns Keepers, Journeys, Paths, Moments, Boards, and more; it is the root scope for multi-tenant data.
- **Keeper** is the core narrative entity, optionally scoped to a Domain, and can own many Journeys and Paths.
- **Journey** belongs to a Keeper and can optionally be scoped to a Domain; it has many Paths and Moments.
- **Path** belongs to a Journey and a Keeper; it has many Moments.
- **Moment** belongs to either a Journey or a Path (or both), optionally scoped to a Domain.

## 🔄 Runtime Experience Model (v0 shell)

- The shell chooses a **frame** (`cover`, `index`, `moment`, `moments`, `commons`, `profile`, `agent`, `kip`, `admin`, etc.) and derives an **experience mode**.
- In the current v0 shell, `ExperienceMode` is derived from path + frame + auth as:
  - `/admin` path => `admin`
  - `kip` or `agent` frame => `kipFocus`
  - `commons` + authenticated => `commons`
  - otherwise => `publicStory`
- Separately, the main web app selects a **world mode** (`presentation` vs `workshop`) from route context and renders different frame renderers accordingly.

## 🧭 JSON Architecture Map (canonical)

```json
{
  "domain": {
    "id": "Domain.id",
    "slug": "Domain.slug",
    "keepers": [
      {
        "id": "Keeper.id",
        "domainId": "Keeper.domainId | null",
        "journeys": [
          {
            "id": "Journey.id",
            "domainId": "Journey.domainId | null",
            "paths": [
              {
                "id": "Path.id",
                "moments": [
                  {
                    "id": "Moment.id",
                    "domainId": "Moment.domainId | null",
                    "journeyId": "Moment.journeyId | null",
                    "pathId": "Moment.pathId | null"
                  }
                ]
              }
            ],
            "moments": [
              {
                "id": "Moment.id",
                "domainId": "Moment.domainId | null",
                "journeyId": "Moment.journeyId | null",
                "pathId": "Moment.pathId | null"
              }
            ]
          }
        ],
        "paths": [
          {
            "id": "Path.id",
            "journeyId": "Path.journeyId",
            "moments": [
              {
                "id": "Moment.id",
                "domainId": "Moment.domainId | null",
                "journeyId": "Moment.journeyId | null",
                "pathId": "Moment.pathId | null"
              }
            ]
          }
        ]
      }
    ],
    "experience": {
      "mode": "publicStory | commons | kipFocus | admin",
      "frames": [
        "cover",
        "index",
        "moment",
        "moments",
        "commons",
        "profile",
        "agent",
        "kip",
        "admin",
        "diagnostics",
        "feed",
        "keepers",
        "journeys"
      ]
    },
    "engagement": {
      "templates": "engagement_templates + engagement_fields",
      "executor": "EngagementTemplateExecutor",
      "clientSubmit": "submitTemplate()"
    }
  }
}
```

## 🔗 Narrative → Schema/Runtime Mapping

- **Journey: Keeper — A Journey of What Is Worth Keeping** maps to the core schema: `Domain` → `Keeper` → `Journey` → `Path` → `Moment`, with optional `domainId` fields and one‑to‑many relations.
- **Journey: The Experience Architecture** maps to the v0 shell runtime: frame registry + current `ExperienceMode` derivation (`publicStory | commons | kipFocus | admin`) and frame navigation (`cover`, `index`, `moment`, `moments`, `commons`, `kip`, `admin`, etc.), and to the web app’s Presentation/Workshop world modes.
- **Journey: Engagement Forward** maps to the engagement pipeline: `engagement_templates` + `engagement_fields` in Prisma, `EngagementTemplateExecutor` in the API, and `submitTemplate()` in the web client.

## 🧭 Path Forward

- **Affirm Present as a first‑class surface**: treat the Presentation world renderer (Porch) as the current implementation anchor, while keeping Present’s narrative intent distinct from capture/edit frames.
- **Decide the bridge between worlds and v0 shell**: clarify whether v0 frames will remain a separate experience layer or converge with the Presentation/Workshop world model.
- **Keep naming layered**: continue using “place/space” in narrative, “mode/frame” in implementation, and “world” for renderer selection to prevent premature collapse.
- **Track future surfacing**: if Present needs explicit routing or frame keys in v0, define them deliberately rather than inheriting existing `moment`/`moments` keys.

## 🛠️ How to Extend Safely

### Add a new frame
1. Add the frame key to `V0FrameKey` in `apps/web/src/v0/shell/V0ShellContext.tsx`.
2. Add the frame component to `FRAME_REGISTRY` in `apps/web/src/v0/shell/V0Shell.tsx`.
3. If the frame changes experience mode behavior, update `useExperienceMode.ts`.

### Add a new engagement template
1. Add a record to `engagement_templates` and `engagement_fields` in Prisma.
2. Ensure the template config aligns with `EngagementTemplateExecutor` (visibility, action endpoint, fields).
3. Use `submitTemplate` in `apps/web/src/lib/engagement/submit.ts` to call the endpoint.

### Extend the schema
1. Update `packages/database/prisma/schema.prisma`.
2. Regenerate Prisma client and run migrations.
3. Update any dependent runtime logic (v0 shell, engagement, or API services).
