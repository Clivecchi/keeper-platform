# KEEPER CODE STATE VERIFICATION

> Generated: 2026-02-06
> Purpose: Comprehensive diagnostic of the current Keeper codebase state
> Method: Automated code inspection via grep, file reading, and trace analysis

---

## 1. JOURNEY SYSTEM — CRUD & API

### Q1.1: Does a Journey creation endpoint exist?

**Answer:** Yes — **two** implementations exist.

**Evidence:**

**Implementation A — `apps/api/src/api/journeys.ts` (lines 184–233)**
- Endpoint: `POST /api/journeys`
- Request body schema (Zod):
  ```typescript
  {
    name: string (min: 1, max: 200),
    forward: string (min: 1, max: 1000),
    keeperId: string (required),
    domainId: string (optional),
    theme_id: string (optional)
  }
  ```
- Creates a Journey with `prisma.journey.create()`, ID generated as `journey-${Date.now()}`
- Returns the created Journey object with status 201

**Implementation B — `apps/api/src/api/journey/domain-integrated-routes.ts` (lines 210–248)**
- Endpoint: `POST /api/journeys` (same path — may conflict or override)
- Request body schema (Zod):
  ```typescript
  {
    title: string (min: 1, max: 200),
    description: string (max: 1000, optional),
    domainId: string (UUID, required),
    keeperId: string (UUID, required),
    tags: string[] (default: []),
    isPublic: boolean (default: false),
    metadata: Record<string, any> (optional)
  }
  ```
- Includes domain permission checks (`requireDomainWriteCompat`)
- Note: Field names differ from Implementation A (`name`/`forward` vs `title`/`description`)

**Current State:** Partially Implemented — Two competing implementations with different schemas. Which one mounts last in `apps/api/src/index.ts` wins.

---

### Q1.2: Does a Journey fetch/list endpoint exist?

**Answer:** Yes.

**Evidence:**

**`apps/api/src/api/journeys.ts` (lines 25–110)**
- Endpoint: `GET /api/journeys`
- Query params: `domainId`, `keeperId`, `limit` (default 20), `offset` (default 0)
- Response format:
  ```json
  {
    "success": true,
    "data": {
      "journeys": [...],
      "total": 100,
      "page": 1,
      "limit": 20
    }
  }
  ```

**`GET /api/journeys/:id`** (lines 115–179) — Single Journey with stats (totalPaths, totalMoments, completedPaths, progressPercentage).

**Domain-integrated version** (`apps/api/src/api/journey/domain-integrated-routes.ts` lines 57–155) adds: `search`, `tags[]`, `status` filtering, domain permission checks, and per-journey `permissions` object.

**Current State:** Working — Endpoints exist and return data. Two implementations may conflict.

---

### Q1.3: Does "Start journey" button in Commons actually work?

**Answer:** Partially — the button exists and calls the engagement system, but depends on a seeded template.

**Evidence:**

**`apps/web/src/v0/frames/commons/CommonsFrame.tsx`** (three instances, e.g., lines 490–495):
```typescript
<EngagementButton
  templateSlug="journey.create"
  context={{ entityType: "domain", entityId: domainId, domainId }}
  label="Start journey"
  variant="secondary"
/>
```

**What happens when clicked:**
1. `EngagementButton` fetches `GET /api/engagement/templates/journey.create` to load the template definition
2. If the template has fields (it does: `name`, `forward`, `keeperId`, `domainId`), it shows an `EngagementModal`
3. On submit, it calls `POST /api/engagement/execute` with `{ templateSlug: "journey.create", context, inputs }`
4. `EngagementTemplateExecutor` loads the template, validates inputs, and calls the configured endpoint (`POST /api/journeys`)

**Dependency:** The `journey.create` engagement template must be seeded in the database. The seed file exists at `packages/database/prisma/seeds/journey-path-moment-engagement-templates.seed.ts`, but if it hasn't been run, the button will fail with "Template not found."

**Current State:** Partially Implemented — Full pipeline exists but requires seeded engagement template and a valid `keeperId`.

---

### Q1.4: How is active Journey stored/tracked?

**Answer:** Yes — managed via `FrameContext` with localStorage persistence.

**Evidence:**

**`apps/web/src/v0/shell/FrameContext.tsx`**:

State initialization (line 124):
```typescript
const [activeJourneyId, setActiveJourneyId] = React.useState<string | null>(null)
```

Resolution logic (lines 212–224):
```typescript
let resolvedJourney = persisted.journeyId
if (resolvedJourney && !journeys.some((j) => j.id === resolvedJourney)) {
  resolvedJourney = null
}
if (!resolvedJourney && journeys.length > 0) {
  resolvedJourney = journeys[0].id
}
```

Persistence (lines 247–253):
```typescript
const handleSetActiveJourneyId = React.useCallback(
  (id: string | null) => {
    setActiveJourneyId(id)
    persistSelection(domainSlug, activeKeeperId, id)
  },
  [domainSlug, activeKeeperId],
)
```

localStorage key pattern: `keeper_v0_active_journey:${domainSlug}`

**Current State:** Working — Active journey is persisted per-domain in localStorage and resolved on mount.

---

## 2. MOMENT → JOURNEY BINDING

### Q2.1: When a Moment is Kept, is journeyId actually sent to the API?

**Answer:** Yes.

**Evidence:**

**`apps/web/src/v0/frames/moment/MomentBody.tsx`** (lines 62–64 and 202–229):

Context extraction:
```typescript
const ctxJourneyId = frameCtx?.selection.activeJourneyId ?? null
```

handleKeep call:
```typescript
const result = await keepMoment(activeDraftId, {
  domainSlug: ctxDomainSlug,
  journeyId: ctxJourneyId ?? undefined,
  keeperId: ctxKeeperId ?? undefined,
})
```

**`apps/web/src/v0/api/v0Moments.ts`** (lines 212–245):
```typescript
const body: Record<string, string> = {};
if (options?.journeyId) body.journeyId = options.journeyId;
if (options?.keeperId) body.keeperId = options.keeperId;

const response = await fetch(url, {
  method: 'POST',
  headers,
  body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
  credentials: 'include',
});
```

**Current State:** Working — `journeyId` is sent in the POST body when keeping a Moment, sourced from FrameContext's `activeJourneyId`.

---

### Q2.2: Does the Keep endpoint accept and save journeyId?

**Answer:** Yes.

**Evidence:**

**`apps/api/src/routes/v0/moments.ts`** (lines 413–534):

JourneyId extraction:
```typescript
const journeyId = typeof req.body?.journeyId === 'string' ? req.body.journeyId : undefined;
```

Database update:
```typescript
const moment = await prisma.moment.update({
  where: { id },
  data: {
    domainId,
    keptAt: new Date(),
    updatedAt: new Date(),
    ...(journeyId ? { journeyId } : {}),
    ...(claimToken ? { claimToken, claimTokenExpiresAt } : {}),
  },
});
```

**Current State:** Working — The API accepts optional `journeyId` and saves it to the Moment record.

---

### Q2.3: In the Prisma schema, what's the Moment → Journey relationship?

**Answer:** Direct foreign key relationship.

**Evidence:**

**`packages/database/prisma/schema.prisma`** (lines 263–287):
```prisma
model Moment {
  id                  String    @id @default(cuid())
  title               String
  narrative           String
  pathId              String?
  journeyId           String?
  ownerId             String?
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt
  theme_id            String?   @db.Uuid
  domainId            String?
  keptAt              DateTime?
  anonKey             String?
  claimToken          String?
  claimTokenExpiresAt DateTime?
  domain              Domain?   @relation(fields: [domainId], references: [id])
  Journey             Journey?  @relation(fields: [journeyId], references: [id])
  Path                Path?     @relation(fields: [pathId], references: [id])
  themes              themes?   @relation(fields: [theme_id], references: [id])

  @@index([pathId])
  @@index([journeyId])
  @@index([domainId])
}
```

**Relation type:** Optional many-to-one (`Moment.journeyId? → Journey.id`). A Moment can belong to zero or one Journey. A Journey can have many Moments. Index exists on `journeyId` for efficient filtering.

**Current State:** Working — Schema is well-defined with proper relations and indexes.

---

### Q2.4: When fetching Moments, can they be filtered by Journey?

**Answer:** Not in v0 endpoints; yes in domain-integrated endpoints.

**Evidence:**

**V0 moments endpoint (`apps/api/src/routes/v0/moments.ts` lines 149–160):**
```typescript
const moments = await prisma.moment.findMany({
  where,
  orderBy: { createdAt: 'desc' },
  take: limit,
  select: {
    id: true,
    title: true,
    narrative: true,
    keptAt: true,
    createdAt: true,
  },
});
```
- Filters by `domainSlug` and `status` only — **no `journeyId` filter**.
- Does not even select `journeyId` in the response.

**Domain-integrated moments endpoint (`apps/api/src/api/moment/domain-integrated-routes.ts`):**
- `GET /api/moments?journeyId=X` — **accepts `journeyId` as query parameter**

**Also:** `GET /api/journeys/:id/moments` returns moments for a specific journey.

**Current State:** Partially Implemented — The v0 endpoint (used by `KeptMomentsBody`) cannot filter by Journey. The domain-integrated endpoint can, but the frontend doesn't use it for the Kept Moments list.

---

## 3. KIP AGENT — DIALOGUE SYSTEM

### Q3.1: Where is Kip's dialogue request handled?

**Answer:** `apps/api/src/api/kip/agents.ts`

**Evidence:**

Endpoint registration (lines 2500–3159):
- `POST /api/kip/agents` with `action="run"` — Main dialogue handler
- `POST /api/kip/agents` with `action="createSession"` — Session creation
- `GET /api/kip/agents` — Get agents, sessions, messages
- `PUT /api/kip/agents` — Update session metadata

Request format:
```typescript
{
  action: "run",
  agentId: string,
  sessionId?: string,
  input: string,          // User message
  mode?: string,          // Agent mode
  outputStyle?: string,   // Response style
  maxChars?: number       // Character limit
}
```

Response: Streaming or JSON with `{ response, actions[], execution }`.

**Current State:** Working — Endpoint exists and handles dialogue.

---

### Q3.2: What happens when Kip receives a message?

**Answer:** Full trace:

**Step 1: Frontend sends message** (via `KipApi` in `apps/web/src/lib/kipApi.ts`)

**Step 2: Backend `KipAgentService.runAgent()` (lines 2054–2376):**
1. Loads agent configuration from database
2. If `memory_enabled`, loads or creates session → retrieves session history
3. Saves user message to session memory
4. Builds system prompt with agent identity, mode, and style
5. Calls `callAIModel()` which routes to `ModelProviderService`

**Step 3: OpenAI API call** (`apps/api/src/services/ModelProviderService.ts` lines 131–190):
- Builds messages array: `[system prompt, ...conversation history, user message]`
- Calls OpenAI Chat Completions API
- Returns raw text response

**Step 4: Response parsing** (`parseStructuredAgentResponse()` lines 488–540):
- Parses JSON from agent response looking for `{ response, actions[] }`
- Validates actions against canonical schema
- Falls back to raw text if not JSON

**Step 5: Action execution** (if actions found):
- `executeAgentActions()` (lines 578–1208)
- Executes `draft.create`, `draft.update`, `draft.delete` within a Prisma transaction
- Returns execution results

**Step 6: Save agent response** to session memory, return to frontend.

**Current State:** Working — Full pipeline from message to response is implemented.

---

### Q3.3: Are OpenAI function calling tools defined?

**Answer:** No — Kip does NOT use OpenAI function calling (tools API).

**Evidence:**

- `ModelProviderService.callModel()` does not pass a `tools` parameter to the OpenAI API
- No `function_call`, `tool_choice`, or OpenAI-style tool definitions exist in `apps/api/src/`
- The `tools` field on `kip_agents` is a string array property (agent capabilities list), NOT OpenAI function definitions

Instead, Kip uses a **custom JSON-based action system**: the agent is prompted to return structured JSON with an `actions` array, which is then parsed and executed server-side.

**Current State:** Not Implemented — No OpenAI function calling. Custom action parsing is used instead.

---

### Q3.4: If tools ARE defined, are there implementations for them?

**Answer:** OpenAI tools are NOT defined. However, custom actions ARE implemented:

**Evidence:**

**`apps/api/src/api/kip/actions/schema.ts`** — Action definitions:
- `draft.create` — Creates a kip_draft record
- `draft.update` — Updates a kip_draft record
- `draft.delete` — Deletes a kip_draft record
- `draft.list` — Lists drafts
- `draft.get` — Gets a specific draft
- `draft.setActive` — Sets active draft on session

**NOT implemented as actions:**
- `create_moment` — Does not exist
- `get_journey_context` — Does not exist
- `save_memory` / `recall_memory` — Do not exist

**Current State:** Partially Implemented — Only draft-related actions exist. No moment creation, journey context, or memory actions.

---

### Q3.5: Why might Kip not respond to a test message?

**Answer:** Multiple potential failure points exist.

**Evidence:**

**Error handling in dialogue endpoint** (`apps/api/src/api/kip/agents.ts`):

1. **Agent not found** — If `agentId` is invalid, returns error
2. **OpenAI call failure** — Wrapped in try/catch (lines 2350–2374), returns generic error message
3. **Action execution failure** — Error message appended to response text:
   ```typescript
   if (execution.failedMessage) {
     finalResponseText = `${structured.responseText} I attempted to create a draft but saving failed: ${execution.failedMessage}`;
   }
   ```
4. **No timeout handling** — No explicit timeout on OpenAI API calls
5. **Missing API key** — If `OPENAI_API_KEY` is not set, the model call will fail silently

**Most likely cause:** Missing or invalid `OPENAI_API_KEY` environment variable, or `agentId` not matching a database record.

**Current State:** Partially Implemented — Error handling exists but no explicit timeout. Failures may appear as silent errors.

---

## 4. KIP AGENT — SESSION CONTEXT

### Q4.1: How are Kip Sessions stored?

**Answer:** In the `kip_sessions` database table.

**Evidence:**

Session creation (`apps/api/src/api/kip/agents.ts` lines 1756–1775):
```typescript
static async createSession(agentId: string, userId?: string, sessionName?: string) {
  const sessionData: KipSessionInput = {
    agent_id: agent.id,
    user_id: userId,
    session_name: sessionName || `Session with ${agent.name}`,
  };
  return await createKipSession(sessionData);
}
```

Messages stored in `kip_messages` table:
```typescript
static async saveMessage(sessionId, sender, content, role, metadata?) {
  const messageData: KipMessageInput = {
    session_id: sessionId,
    sender,
    content,
    role,
    metadata: metadata || {}
  };
  await createKipMessage(messageData);
}
```

**Current State:** Working — Sessions and messages are stored in the database.

---

### Q4.2: Does Session track active Journey/Keeper?

**Answer:** No — sessions do not track Journey or Keeper context.

**Evidence:**

- `kip_sessions` links to `kip_drafts` (active draft for session) but has no `activeJourneyId` or `activeKeeperId` field
- Session creation only takes `agent_id`, `user_id`, and `session_name`
- No journey or keeper context is passed to or stored in sessions

**Current State:** Not Implemented — Sessions are agent-scoped only, with no journey/keeper awareness.

---

### Q4.3: Is Journey context injected into Kip's system prompt?

**Answer:** No.

**Evidence:**

System prompt construction (`apps/api/src/api/kip/agents.ts` lines 1944–2004):
```typescript
const systemPrompt = [
  promptOptions?.lens?.systemPrompt || '',
  `You are ${agent.name}, ${agent.purpose}. ${config.tagline || ''}`.trim(),
  `Mode: ${mode.toUpperCase()}. Output style: ${styleHelper[outputStyle]}`,
  maxChars && maxChars > 0
    ? `Hard limit: keep the Debug Brief under ${maxChars} characters...`
    : 'No hard character limit configured for this mode.',
  // ... mode-specific instructions
].filter(Boolean).join('\n\n');
```

- No call to any Journey or Keeper context service
- No `SoleMemoryService.getSystemPromptExtension()` call
- No dynamic context injection beyond agent identity and mode

**Current State:** Not Implemented — System prompt is static agent identity + mode instructions only.

---

## 5. SOLE MEMORY SYSTEM

### Q5.1: Is SOLE memory actually being used anywhere?

**Answer:** Defined extensively, minimally used at runtime.

**Evidence:**

**Database models** (`packages/database/prisma/schema.prisma` lines 832–917):
- `SoleReflection` — Defined with full schema ✅
- `SoleMemoryCard` — Defined with embedding support ✅
- `SoleEcho` — Defined with trigger conditions ✅
- `SoleVoiceEntry` — Defined ✅
- `SoleLogbookEntry` — Defined with tags/categories ✅

**API endpoints** — Full CRUD exists for all five SOLE models:
- `apps/api/src/api/keeper/sole-reflections.ts`
- `apps/api/src/api/keeper/sole-memory-cards.ts`
- `apps/api/src/api/keeper/sole-echo-writer.ts`
- `apps/api/src/api/keeper/sole-voice-panel.ts`
- `apps/api/src/api/keeper/sole-identity-logbook.ts`
- `apps/api/src/api/memory/sole-memory-routes.ts` (domain-scoped memory)

**Frontend UI components:**
- `apps/web/src/components/engagement/MemoryCardManager.tsx` — SoleMemoryCard UI
- `apps/web/src/components/engagement/ReflectionJournal.tsx` — SoleReflection UI
- `apps/web/src/components/engagement/EchoWriter.tsx` — SoleEcho UI

**Service layer:**
- `apps/api/src/services/SoleMemoryService.ts` — `getSoleMemoryLoopInstruction()`, `isKeeperUsingSOLE()`, `getSystemPromptExtension()`

**Count:** ~30+ files with type definitions/imports. ~5 files with actual runtime usage (API handlers + 3 UI components). Zero integration with Kip dialogue.

**Current State:** Partially Implemented — Full schema, API, and UI exist. But SOLE is NOT connected to Kip's dialogue system. It's an isolated subsystem.

---

### Q5.2: Are there API endpoints for SOLE memory?

**Answer:** Yes — extensive.

**Evidence:**

| Endpoint Group | File | Routes |
|---|---|---|
| Reflections | `apps/api/src/api/keeper/sole-reflections.ts` | GET, POST, PUT, DELETE, promote |
| Memory Cards | `apps/api/src/api/keeper/sole-memory-cards.ts` | GET, GET by-topic, PUT, DELETE, generate-embeddings, search |
| Echoes | `apps/api/src/api/keeper/sole-echo-writer.ts` | GET, GET triggered, POST, PUT, deliver, DELETE |
| Voice Panel | `apps/api/src/api/keeper/sole-voice-panel.ts` | GET, POST, PUT, DELETE |
| Logbook | `apps/api/src/api/keeper/sole-identity-logbook.ts` | GET, GET categories, GET tags, POST, PUT, DELETE |
| Domain Memory | `apps/api/src/api/memory/sole-memory-routes.ts` | scope, query, insert, update, delete, share, migrate, analytics, health, cleanup, backup, restore |

**Current State:** Working — Endpoints are implemented with full CRUD. Whether they're tested/functional in production is unknown.

---

### Q5.3: Can Kip read from SOLE memory?

**Answer:** No.

**Evidence:**

- `SoleMemoryService` is NOT imported in `apps/api/src/api/kip/agents.ts`
- No SOLE queries are made during Kip dialogue
- `getSystemPromptExtension()` exists but is never called
- `isKeeperUsingSOLE()` exists but is never called from Kip

**Current State:** Not Implemented — SOLE exists as an independent system with no connection to Kip's conversation flow.

---

### Q5.4: What does "Memory: SOLE" in Kip Cockpit actually mean?

**Answer:** It's based on the agent's `memory_enabled` flag — not actual SOLE data.

**Evidence:**

**`apps/web/src/pages/kip/KipAgentBoardPage.tsx`** (lines 2585–2608):
```typescript
<div className="flex items-center justify-between">
  <dt>Memory</dt>
  <dd className="font-semibold">{agent?.memory_enabled ? 'SOLE' : 'Off'}</dd>
</div>
```

**Context tokens display** (hardcoded, lines 2567–2583):
```typescript
<li className="flex items-center justify-between">
  <span>Context tokens</span>
  <span className="font-semibold">2,847 / 4,000</span>
</li>
<li className="text-xs text-gray-500">
  SOLE memory system active — tracking key life events and journey progress.
</li>
```

**Current State:** Mock Data — "Memory: SOLE" is derived from a boolean flag. "2,847 / 4,000 context tokens" is hardcoded. The descriptive text is static.

---

## 6. COCKPIT "TOOLS ENABLED" STATUS

### Q6.1: Are the "Keeper context enabled" checkmarks real or mock?

**Answer:** Hardcoded mock.

**Evidence:**

**`apps/web/src/pages/kip/KipAgentBoardPage.tsx`** (lines 2610–2624):
```typescript
<FrameCard title="Tools & Integrations">
  <ul className="space-y-2 text-sm">
    {['Keeper context', 'Journey tracking', 'Moment creation'].map((tool) => (
      <li key={tool} className="flex items-center gap-2 text-emerald-600">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        {tool} enabled
      </li>
    ))}
  </ul>
</FrameCard>
```

This is a static string array rendered with green dots. No API calls, no config checks, no backend capability verification.

**Current State:** Mock Data — 100% hardcoded JSX. None of these tools actually exist in Kip's runtime.

---

### Q6.2: Where is "Moment creation enabled" determined?

**Answer:** It's not determined — it's always shown as enabled.

**Evidence:** Same hardcoded array as Q6.1. The string `"Moment creation"` is in a static list. There is no:
- (a) config flag
- (b) backend capability check
- (c) conditional rendering

**Current State:** Mock Data — Always displays "enabled" regardless of actual capabilities.

---

## 7. DRAFTS CONFUSION

### Q7.1: What table/model stores Moment drafts (auto-saves)?

**Answer:** No separate table — drafts are Moment records with `keptAt = null`.

**Evidence:**

The `Moment` model has:
```prisma
keptAt DateTime?
```

- `keptAt = null` → Draft moment (auto-saved, not yet kept)
- `keptAt = DateTime` → Kept moment (published)

The v0 moments endpoint filters on this:
```typescript
url.searchParams.set('status', 'kept');  // Only kept moments
```

There is no separate `MomentDraft` model.

**Current State:** Working — Simple and effective. Drafts are moments without a `keptAt` timestamp.

---

### Q7.2: What are "Kip Drafts" supposed to be?

**Answer:** Kip Drafts are a **separate system** from Moment drafts — they are agent-generated structured documents.

**Evidence:**

**Prisma model** (`packages/database/prisma/schema.prisma` lines 641–661):
```prisma
model kip_drafts {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  domain_id String
  owner_id  String
  agent_id  String?  @db.Uuid
  kind      String
  key       String
  title     String
  summary   String?
  status    String   @default("draft")
  spec_json Json     @default("{}")
  created_at DateTime @default(now())
  updated_at DateTime @default(now())
  // relations...
  @@unique([domain_id, owner_id, kind, key])
}
```

**Drafts tab** calls `KipApi.listDrafts(domainId)` → `GET /api/domains/${domainId}/kip/drafts`

The tab shows a two-column layout:
- Left: Draft directory (list of domain-scoped drafts)
- Right: Draft editor (title, summary, status, JSON spec editor)

Drafts can be set as the "active draft" for a Kip session, allowing the agent to read/modify them during conversation via the `draft.create`/`draft.update` actions.

**Current State:** Working — Kip Drafts are a real, functional system separate from Moment drafts.

---

### Q7.3: Why might Kip Drafts show "HTTP 400" error?

**Answer:** Multiple 400 error paths exist.

**Evidence:**

**`apps/api/src/api/domains/kip-drafts.ts`:**

1. **Missing required fields** (line 162–165):
   ```typescript
   if (!body.kind || !body.key || !body.title) {
     return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD', message: 'kind, key, and title are required' });
   }
   ```

2. **Zod validation error** (lines 226–229):
   ```typescript
   if (error instanceof z.ZodError) {
     return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD', code: 'VALIDATION_ERROR', ... });
   }
   ```

3. **Missing domain context** — If `domainId` isn't resolved from the URL

**Most likely cause for "HTTP 400" on the Drafts tab:** The `domainId` is either not set or the user doesn't have auth credentials (cookie not set after registration — see Q9.1).

**Current State:** Partially Working — The endpoint works but requires valid auth + domain context.

---

## 8. FRAME CONTEXT PROVIDER

### Q8.1: Is FrameContextProvider actually being used?

**Answer:** Yes.

**Evidence:**

**`apps/web/src/v0/shell/V0Shell.tsx`** (line 24, lines 160–186):
```typescript
import { FrameContextProvider } from "./FrameContext"

// ... later in render:
<FrameContextProvider
  domainSlug={slug}
  frame={frame}
  experienceMode={experience.state.mode}
  themeSlug={themeSlug}
  draftId={draftId}
>
  {/* All frame components rendered here */}
</FrameContextProvider>
```

All frames are wrapped by `FrameContextProvider`. It is rendering and providing context.

**Current State:** Working — Provider is mounted and wrapping all frame components.

---

### Q8.2: Do Frames actually consume FrameContext?

**Answer:** Some do, most don't.

**Evidence:**

**Frames using `useFrameContextOptional()`:**

| Frame | File | What it uses |
|---|---|---|
| CommonsFrame | `apps/web/src/v0/frames/commons/CommonsFrame.tsx` | `activeJourneyId` for breadcrumb, domain sync |
| MomentBody | `apps/web/src/v0/frames/moment/MomentBody.tsx` | `activeJourneyId`, `activeKeeperId` for keep binding |
| moment-frame | `apps/web/src/v0/components/moment-frame.tsx` | Domain slug and theme resolution |

**Frames NOT using FrameContext:**
- JourneysFrame — Placeholder, no context usage
- KeepersFrame — No context usage
- FeedFrame — No context usage
- ProfileFrame — No context usage
- AdminFrame — No context usage
- AgentFrame — No context usage (wraps KipAgentBoardPage which has its own state)
- CoverFrame — No context usage
- PresentFrame — No context usage
- DiagnosticsFrame — No context usage
- IndexFrame — No context usage

**Current State:** Partially Implemented — Only 3 of 14 frames consume FrameContext. Most frames operate independently.

---

### Q8.3: Is Journey breadcrumb showing in Commons?

**Answer:** Yes — code exists and should render when a Journey is active.

**Evidence:**

**`apps/web/src/v0/frames/commons/CommonsFrame.tsx`** (lines 702–708):
```typescript
{activeJourneyName && (
  <div className="flex items-center gap-2 text-xs" style={{ color: COMMONS_SURFACE.inkSecondary }}>
    <span className="uppercase tracking-[0.2em] text-[10px]">Journey</span>
    <span style={{ color: COMMONS_SURFACE.inkPrimary }} className="font-medium">{activeJourneyName}</span>
  </div>
)}
```

Name resolution (lines 219–225):
```typescript
if (activeJourneyId) {
  const activeJ = (journeys as JourneySummary[]).find((j) => j.id === activeJourneyId)
  setActiveJourneyName(activeJ?.name ?? null)
} else if ((journeys as JourneySummary[]).length > 0) {
  setActiveJourneyName((journeys as JourneySummary[])[0].name)
}
```

**Why it might not show:** If no Journeys exist in the domain (API returns empty array), `activeJourneyName` will be null, and the breadcrumb won't render.

**Current State:** Working — Code is correct but depends on Journeys existing in the database.

---

## 9. AUTHENTICATION ISSUES

### Q9.1: Does registration set a session cookie?

**Answer:** NO — this is a bug.

**Evidence:**

**`apps/api/src/index.ts`** (lines 775–855):

The register handler creates the user, creates a personal domain, signs a JWT token, and returns it in the response body:
```typescript
const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'fallback-secret', {
  expiresIn: '7d',
});

return res.status(201).json({
  success: true,
  data: {
    user: { id: newUser.id, email: newUser.email, name: newUser.name, avatar_url: newUser.avatar_url },
    token,
  },
});
```

**No `res.setHeader('Set-Cookie', ...)` call exists.** Compare to the login handler (lines 740–755) which DOES set the cookie:
```typescript
const cookieValue = [
  `${COOKIE_NAME}=${token}`,
  `Domain=${COOKIE_DOMAIN}`,
  'Path=/',
  'HttpOnly',
  // ...
].filter(Boolean).join('; ');
res.setHeader('Set-Cookie', cookieValue);
```

**Impact:** After registration, the user has a token in the response body but no cookie set. The frontend must either manually set the token or redirect to login. If the frontend relies on cookies (which it does via `credentials: 'include'`), the user will appear unauthenticated immediately after registration.

**Current State:** Broken — Registration does not set the session cookie.

---

### Q9.2: How many auth implementations exist?

**Answer:** At least 4 competing implementations.

**Evidence:**

| # | Location | Status |
|---|---|---|
| 1 | `apps/api/src/index.ts` (inline) | **ACTIVE** — Login (line 706), Register (line 775), Logout (line 857) |
| 2 | `apps/api/src/kam/auth.ts` + `auth-routes.ts` | **INACTIVE** — Mounted but overridden by inline handlers |
| 3 | `apps/api/src/kam/session.ts` | **UTILITY** — Cookie helper functions, `authWeb` middleware |
| 4 | `packages/kam/src/auth/login.ts` + `register.ts` | **UNUSED** — Package-level handlers, not mounted |

The inline handlers in `index.ts` are registered BEFORE the KAM auth router, so they intercept requests first. The KAM router (`apps/api/src/kam/auth-routes.ts`) is mounted at `/api/kam/auth` (line 1022) but its POST routes are never reached.

Additionally, the inline login handler uses `SameSite=Lax` while `session.ts` uses `SameSite=None` — these differ in cross-origin behavior.

**Current State:** Broken — Multiple competing implementations cause confusion. Only inline handlers are active.

---

### Q9.3: What's the env variable naming issue?

**Answer:** Mismatch between `.env.production` and code.

**Evidence:**

**`.env.production`** (`apps/web/.env.production`):
```
VITE_API_BASE_URL=https://keeper-platform-production.up.railway.app
```

**Code** (`apps/web/src/lib/apiFetch.ts` line 10):
```typescript
const RAW_BASE = ((import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com').replace(/\/$/, '');
```

| What | Variable Name | Value |
|---|---|---|
| .env.production defines | `VITE_API_BASE_URL` | `https://keeper-platform-production.up.railway.app` |
| Code expects | `VITE_API_URL` | Falls back to `https://api.ke3p.com` |

**Impact:** In production, `VITE_API_URL` is undefined, so the code uses the fallback `https://api.ke3p.com`. The `.env.production` value is **ignored** because the variable name doesn't match.

**Current State:** Broken — Production API URL is never read from env.

---

## 10. KEPT MOMENTS LIST

### Q10.1: Does the Kept Moments list show Journey context?

**Answer:** No.

**Evidence:**

**`apps/web/src/v0/frames/moment/KeptMomentsBody.tsx`** (lines 53–64):
```typescript
{moments.map((moment) => (
  <div key={moment.id} className="rounded-sm border px-4 py-3" style={{ borderColor: "var(--theme-border-soft)" }}>
    <div className="text-sm font-medium">{moment.title}</div>
    <div className="text-xs opacity-70">
      {moment.keptAt ? new Date(moment.keptAt).toLocaleString() : "Kept"}
    </div>
    {moment.body && (
      <div className="mt-2 text-xs opacity-80">{moment.body.slice(0, 140)}</div>
    )}
  </div>
))}
```

Only displays: title, keptAt date, body preview. No journey name or journey ID.

The API also doesn't return `journeyId` in the select clause:
```typescript
select: { id: true, title: true, narrative: true, keptAt: true, createdAt: true }
```

**Current State:** Not Implemented — Journey context is not shown on kept moments.

---

### Q10.2: Can Moments list be filtered by Journey?

**Answer:** No (in the v0 frontend).

**Evidence:**

- `KeptMomentsBody.tsx` has no filter UI
- `getKeptMoments()` in `v0Moments.ts` only accepts `domainSlug` and `limit`
- The v0 moments API endpoint doesn't accept `journeyId` as a query parameter
- No filter dropdown or Journey selector exists in the component

**Current State:** Not Implemented — No filtering capability in the v0 Kept Moments view.

---

## 11. NAVIGATION & ROUTING

### Q11.1: How do you navigate from Commons to Journey detail?

**Answer:** Via "Open journeys" button → JourneysFrame (placeholder).

**Evidence:**

**`apps/web/src/v0/frames/commons/CommonsFrame.tsx`** (lines 240–262):
```typescript
{
  title: "Journeys",
  description: "Active paths and suggested threads to follow.",
  items: journeyItems.length ? journeyItems : ["No journeys yet", "Start a new journey to begin"],
  actionLabel: "Open journeys",
  onAction: () => navigateToFrame("journeys")
}
```

This navigates to `/d/:slug/board?frame=journeys`, which renders `JourneysFrame`.

**But JourneysFrame is a placeholder** — it shows "Coming soon" text and a "Back to Commons" button. There is no Journey detail view.

**Current State:** Partially Implemented — Navigation exists but leads to a placeholder.

---

### Q11.2: How do you navigate from Journey detail to Moment detail?

**Answer:** Not possible — JourneysFrame is a placeholder.

**Evidence:**

**`apps/web/src/v0/frames/journeys/JourneysFrame.tsx`** (full file):
```typescript
<div className="rounded-2xl border p-6 text-sm shadow-sm" ...>
  <p className="font-medium mb-2">Coming soon</p>
  <p>Journey exploration is being prepared. Return to the commons to explore what is available now.</p>
  <button type="button" onClick={experienceActions.goCommons} ...>
    Back to Commons
  </button>
</div>
```

No moment listing, no click handlers, no navigation to moment detail.

**Current State:** Not Implemented — JourneysFrame is entirely a placeholder.

---

## 12. HYPOTHESIS VERIFICATION

### H1: Is the FrameContext system fully wired and working?

**Answer:** NO — Partially wired.

**Evidence:** FrameContextProvider is mounted in V0Shell and provides `activeJourneyId` + `activeKeeperId` with localStorage persistence. However, only 3 of 14 frames consume it (CommonsFrame, MomentBody, moment-frame). Most frames operate independently. The system works for what it covers but is far from complete.

---

### H2: Can Moments be successfully bound to Journeys right now?

**Answer:** YES — but only during the Keep action, and the binding is invisible afterward.

**Evidence:** When a user Keeps a moment, `journeyId` flows from FrameContext → MomentBody → v0Moments API → v0 moments backend → Prisma update. The `journeyId` is saved on the Moment record. However:
- The Kept Moments list doesn't show which Journey a moment belongs to
- There's no way to filter moments by Journey in the v0 UI
- The JourneysFrame is a placeholder, so you can't view moments within a Journey

---

### H3: Are Kip's tools (create_moment, etc.) defined but not implemented?

**Answer:** NO — they are neither defined nor implemented.

**Evidence:** Kip does not use OpenAI function calling. It uses a custom JSON action system with only draft-related actions (`draft.create`, `draft.update`, `draft.delete`). There are no `create_moment`, `get_journey_context`, `save_memory`, or `recall_memory` actions defined anywhere.

---

### H4: Is SOLE memory completely unused/non-functional?

**Answer:** NO — SOLE has full schema, API, and UI, but it is DISCONNECTED from Kip.

**Evidence:** SOLE memory has 5 database models, ~30 API endpoints, 3 frontend UI components, and a service layer. However, `SoleMemoryService` is never called from Kip's dialogue handler. SOLE operates as an isolated subsystem — you can manually CRUD SOLE records via the API/UI, but Kip cannot read from or write to SOLE during conversations.

---

### H5: Is the Cockpit UI showing mock data?

**Answer:** YES — partially.

**Evidence:**
- "Memory: SOLE" → derived from `agent.memory_enabled` boolean (real but misleading)
- "2,847 / 4,000 context tokens" → **hardcoded**
- "SOLE memory system active — tracking key life events..." → **hardcoded text**
- "Keeper context enabled / Journey tracking enabled / Moment creation enabled" → **hardcoded array**, always green, no capability check
- Agent Configuration (Provider, Model) → **real data** from agent record

---

### H6: Are there multiple competing auth systems causing issues?

**Answer:** YES.

**Evidence:** Four auth implementations exist. The inline handlers in `index.ts` are active; the KAM router handlers are dead code. The registration handler doesn't set cookies (bug). The env variable for API URL is mismatched. These issues compound: a user who registers is not authenticated, and production may be hitting the wrong API endpoint.

---

### H7: Can a user currently complete this flow: Create Journey → Write Moment → Keep → View in Journey?

**Answer:** NO — the flow breaks at multiple points.

**Evidence — Flow Trace:**

1. **Create Journey** — User clicks "Start journey" in Commons
   - Requires `journey.create` engagement template to be seeded → **May fail if not seeded**
   - Requires valid auth cookie → **Registration doesn't set cookie (Q9.1)**
   - If template exists and user is authenticated: Journey is created via engagement executor → POST /api/journeys → ✅

2. **Write Moment** — User navigates to moment frame, writes content
   - Draft auto-saves work → ✅

3. **Keep Moment** — User clicks "Keep"
   - `journeyId` from FrameContext is sent → ✅
   - API saves `journeyId` on Moment → ✅

4. **View in Journey** — User navigates to JourneysFrame
   - JourneysFrame shows "Coming soon" → **BLOCKED**
   - No way to see which moments are in a Journey
   - Kept Moments list doesn't show journey context → **BLOCKED**

**Result:** Flow breaks at step 1 (auth/template) and step 4 (no Journey detail view).

---

## 13. CRITICAL GAPS SUMMARY

### Top 5 Critical Implementation Gaps

| # | Gap | What's Missing | File(s) Affected |
|---|---|---|---|
| 1 | **Registration Cookie Bug** | `POST /api/kam/auth/register` does not set `keeper_session` cookie, leaving new users unauthenticated | `apps/api/src/index.ts` (line 775–855) |
| 2 | **JourneysFrame is Placeholder** | No Journey detail view — users cannot see journey contents, moments within journeys, or navigate between journeys and moments | `apps/web/src/v0/frames/journeys/JourneysFrame.tsx` |
| 3 | **Kip Has No Journey/Memory Context** | Kip's system prompt contains no Journey, Keeper, or SOLE context. No `create_moment` or memory tools exist. Sessions don't track active journey. | `apps/api/src/api/kip/agents.ts`, `apps/api/src/services/SoleMemoryService.ts` |
| 4 | **Env Variable Mismatch** | `.env.production` defines `VITE_API_BASE_URL` but code reads `VITE_API_URL`, causing production to fall back to `https://api.ke3p.com` | `apps/web/.env.production`, `apps/web/src/lib/apiFetch.ts` |
| 5 | **Kept Moments Missing Journey Context** | Kept Moments list doesn't show/filter by Journey. API doesn't return `journeyId`. No journey filter UI. | `apps/web/src/v0/frames/moment/KeptMomentsBody.tsx`, `apps/api/src/routes/v0/moments.ts`, `apps/web/src/v0/api/v0Moments.ts` |

---

## 14. WORKING FEATURES SUMMARY

| Status | Feature | Evidence |
|---|---|---|
| ✅ | **Journey CRUD API** | Full endpoints at `POST/GET/PUT/DELETE /api/journeys` with domain integration (`apps/api/src/api/journeys.ts`, `apps/api/src/api/journey/domain-integrated-routes.ts`) |
| ✅ | **Moment draft auto-save** | v0 moments endpoint creates/saves drafts with anonymous or authenticated access (`apps/api/src/routes/v0/moments.ts`) |
| ✅ | **Moment → Journey binding at keep time** | `journeyId` flows from FrameContext → frontend → API → database (`MomentBody.tsx` → `v0Moments.ts` → `moments.ts`) |
| ✅ | **FrameContext with localStorage persistence** | Active journey and keeper tracked per-domain in localStorage, resolved on mount (`apps/web/src/v0/shell/FrameContext.tsx`) |
| ✅ | **Journey breadcrumb in Commons** | Shows active journey name when journeys exist in domain (`apps/web/src/v0/frames/commons/CommonsFrame.tsx` lines 702–708) |
| ✅ | **Login with cookie authentication** | Login sets HttpOnly `keeper_session` cookie with 7-day expiry (`apps/api/src/index.ts` lines 706–773) |
| ✅ | **Kip dialogue with session memory** | Full pipeline: message → session → OpenAI → action parsing → response with conversation history (`apps/api/src/api/kip/agents.ts`) |
| ✅ | **Kip draft actions** | Agent can create/update/delete kip_drafts via structured JSON actions (`apps/api/src/api/kip/actions/schema.ts`) |
| ✅ | **Kip Drafts tab** | Full CRUD UI for domain-scoped drafts with editor (`apps/web/src/pages/kip/KipAgentBoardPage.tsx`) |
| ✅ | **SOLE memory schema + API** | 5 models, ~30 endpoints, service layer all implemented (`packages/database/prisma/schema.prisma`, `apps/api/src/api/keeper/sole-*`) |
| ✅ | **Frame-based navigation** | 14 frames registered, URL-driven routing via `?frame=` param, centralized `navigateToFrame()` (`apps/web/src/v0/shell/V0Shell.tsx`) |
| ✅ | **Engagement template system** | Template executor loads from DB, validates inputs, calls configured endpoints (`apps/api/src/services/EngagementTemplateExecutor.ts`) |
| ✅ | **Domain-scoped v0 experience** | Full v0 shell with domain resolution, theme system, style system, experience modes (`apps/web/src/v0/shell/`) |

---

## APPENDIX: File Location Reference

### API Route Files
```
apps/api/src/index.ts                              — Main entry, inline auth handlers
apps/api/src/api/journeys.ts                       — Journey CRUD (basic)
apps/api/src/api/journey/domain-integrated-routes.ts — Journey CRUD (with domain perms)
apps/api/src/api/moment/domain-integrated-routes.ts — Moment CRUD (with domain perms)
apps/api/src/routes/v0/moments.ts                  — V0 Moment endpoints (draft/keep)
apps/api/src/api/kip/agents.ts                     — Kip agent dialogue handler
apps/api/src/api/kip/actions/schema.ts             — Kip action definitions
apps/api/src/api/domains/kip-drafts.ts             — Kip drafts CRUD
apps/api/src/api/engagement/execute.ts             — Engagement template executor
apps/api/src/api/engagement/templates.ts           — Engagement template lookup
apps/api/src/api/keeper/sole-reflections.ts        — SOLE reflections API
apps/api/src/api/keeper/sole-memory-cards.ts       — SOLE memory cards API
apps/api/src/api/keeper/sole-echo-writer.ts        — SOLE echoes API
apps/api/src/api/keeper/sole-voice-panel.ts        — SOLE voice panel API
apps/api/src/api/keeper/sole-identity-logbook.ts   — SOLE logbook API
apps/api/src/api/memory/sole-memory-routes.ts      — Domain-scoped memory API
apps/api/src/kam/auth.ts                           — KAM auth handlers (inactive)
apps/api/src/kam/auth-routes.ts                    — KAM auth router (inactive)
apps/api/src/kam/session.ts                        — Session/cookie utilities
```

### Frontend Frame Files
```
apps/web/src/v0/shell/V0Shell.tsx                  — Main shell + frame routing
apps/web/src/v0/shell/FrameContext.tsx              — Frame context provider
apps/web/src/v0/shell/V0ShellContext.tsx            — Shell context + frame types
apps/web/src/v0/frames/commons/CommonsFrame.tsx     — Commons (main frame)
apps/web/src/v0/frames/moment/MomentBody.tsx        — Moment editor + keep
apps/web/src/v0/frames/moment/KeptMomentsBody.tsx   — Kept moments list
apps/web/src/v0/frames/journeys/JourneysFrame.tsx   — Journeys (PLACEHOLDER)
apps/web/src/v0/frames/agent/AgentFrame.tsx         — Kip agent frame wrapper
apps/web/src/v0/api/v0Moments.ts                   — V0 moments API client
apps/web/src/lib/apiFetch.ts                       — API fetch with env config
apps/web/src/lib/kipApi.ts                         — Kip API client
apps/web/src/pages/kip/KipAgentBoardPage.tsx        — Kip board page + cockpit
apps/web/src/components/engagement/EngagementButton.tsx — Engagement button
```

### Database
```
packages/database/prisma/schema.prisma             — Full Prisma schema
packages/database/prisma/seeds/                    — Seed files including engagement templates
```

### Service Layer
```
apps/api/src/services/ModelProviderService.ts      — OpenAI/model integration
apps/api/src/services/SoleMemoryService.ts         — SOLE memory service
apps/api/src/services/EngagementTemplateExecutor.ts — Engagement executor
```
