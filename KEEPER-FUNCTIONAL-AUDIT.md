# Keeper Functional Audit

Scope: static code inspection only (no runtime verification). Evidence is cited with file paths and snippets.

---

## 1. UI INVENTORY - Interfaces and Entry Points

Primary route map is defined in `apps/web/src/App.tsx`.

Evidence:
```1:120:apps/web/src/App.tsx
import { Routes, Route } from 'react-router-dom';
// ... page imports
const App: React.FC = () => {
  return (
    <Routes>
      {/* Admin-only Routes */}
      <Route element={<RequireAdminRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/legacy" element={<Navigate to="/settings" replace />} />
        </Route>
      </Route>
      {/* Protected Routes - Require Authentication */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/settings" element={<SettingsPage />} />
          ...
```

### UI Inventory Table

| Component/Page | File Path | Purpose | Estimated State |
| --- | --- | --- | --- |
| LandingPage | `apps/web/src/pages/LandingPage.tsx` | Marketing/landing | Unknown |
| LoginPage | `apps/web/src/pages/LoginPage.tsx` | Login UI | Partially Working (depends on auth API) |
| RegisterPage | `apps/web/src/pages/RegisterPage.tsx` | Registration UI | Partially Working (see auth gaps) |
| DebugPage | `apps/web/src/pages/DebugPage.tsx` | Debug tools | Unknown |
| RootDashboardPage | `apps/web/src/pages/root/RootDashboardPage.tsx` | Root dashboard | Unknown |
| SettingsPage | `apps/web/src/pages/settings/SettingsPage.tsx` | User settings | Unknown |
| UserApiKeyManagerPage (settings) | `apps/web/src/pages/settings/UserApiKeyManagerPage.tsx` | User API keys (new location) | Unknown |
| UserApiKeyManagerPage (legacy) | `apps/web/src/pages/UserApiKeyManagerPage.tsx` | Legacy API keys | Likely duplicate/legacy |
| BoardStudioPage | `apps/web/src/pages/studio/board-studio-page.tsx` | Board studio UI | Unknown |
| AgentBoardPage | `apps/web/src/pages/studio/AgentBoardPage.tsx` | Agent board UI | Unknown |
| DomainBoardPage | `apps/web/src/pages/studio/DomainBoardPage.tsx` | Domain board UI | Unknown |
| JourneyBoardPage | `apps/web/src/pages/studio/journey-board-page.tsx` | Journey board UI | Unknown |
| KeeperTypeBoardPage | `apps/web/src/pages/studio/keeper-type-board-page.tsx` | Keeper type board UI | Unknown |
| PeopleBoardPage | `apps/web/src/pages/studio/people-board-page.tsx` | People board UI | Unknown |
| KipStudioPage | `apps/web/src/pages/studio/KipStudioPage.tsx` | KIP studio UI | Unknown |
| AgentsPage | `apps/web/src/pages/studio/kip/AgentsPage.tsx` | Agent management | Unknown |
| AgentLogsPage | `apps/web/src/pages/studio/kip/AgentLogsPage.tsx` | Agent logs | Unknown |
| PlatformApiKeyManagerPage | `apps/web/src/pages/studio/kip/PlatformApiKeyManagerPage.tsx` | Platform API keys | Unknown |
| AdminPage | `apps/web/src/pages/studio/AdminPage.tsx` | Studio admin | Unknown |
| MemoryPatternsPage | `apps/web/src/pages/studio/MemoryPatternsPage.tsx` | Memory patterns | Unknown |
| AgentClassesPage | `apps/web/src/pages/studio/AgentClassesPage.tsx` | Agent classes | Unknown |
| DomainWorkshopPage | `apps/web/src/pages/studio/domain/DomainWorkshopPage.tsx` | Domain workshop | Unknown |
| DomainBoardStudioPage | `apps/web/src/pages/studio/domain/DomainBoardStudioPage.tsx` | Domain board studio | Unknown |
| DomainsPage | `apps/web/src/pages/admin/DomainsPage.tsx` | Admin domain management | Unknown |
| RolesPage | `apps/web/src/pages/admin/RolesPage.tsx` | Admin roles | Unknown |
| UserManagementPage | `apps/web/src/pages/admin/UserManagementPage.tsx` | Admin user management | Unknown |
| DomainAdminPage | `apps/web/src/pages/d/DomainAdminPage.tsx` | Domain admin | Unknown |
| AllKeepersPage | `apps/web/src/pages/keeper/AllKeepersPage.tsx` | List keepers | Unknown |
| CreateKeeperPage | `apps/web/src/pages/keeper/CreateKeeperPage.tsx` | Create keeper | Unknown |
| KeeperDashboardPage | `apps/web/src/pages/keeper/KeeperDashboardPage.tsx` | Keeper dashboard | Placeholder (Coming Soon) |
| KeeperManagePage | `apps/web/src/pages/keeper/KeeperManagePage.tsx` | Manage keepers | Unknown |
| KeeperTypesPage | `apps/web/src/pages/keeper/KeeperTypesPage.tsx` | Keeper types | Unknown |
| KeeperJourneysPage | `apps/web/src/pages/keeper/KeeperJourneysPage.tsx` | Keeper journeys | Placeholder (Coming Soon) |
| KeeperMomentsPage | `apps/web/src/pages/keeper/KeeperMomentsPage.tsx` | Keeper moments | Placeholder (Coming Soon) |
| KeeperMemoryPage | `apps/web/src/pages/keeper/KeeperMemoryPage.tsx` | Keeper memory | Unknown |
| ReflectionJournalPage | `apps/web/src/pages/keeper/ReflectionJournalPage.tsx` | Reflection journal | Unknown |
| MemoryCardManagerPage | `apps/web/src/pages/keeper/MemoryCardManagerPage.tsx` | Memory cards | Unknown |
| VoicePanelPage | `apps/web/src/pages/keeper/VoicePanelPage.tsx` | Voice panel | Unknown |
| EchoWriterPage | `apps/web/src/pages/keeper/EchoWriterPage.tsx` | Echo writer | Unknown |
| IdentityLogbookPage | `apps/web/src/pages/keeper/IdentityLogbookPage.tsx` | Identity logbook | Unknown |
| EngagementTemplatesPage | `apps/web/src/pages/keeper/EngagementTemplatesPage.tsx` | Engagement templates | Unknown |
| DomainDashboardPage | `apps/web/src/pages/keeper/DomainDashboardPage.tsx` | Domain dashboard | Unknown |
| SelectedKeeperMetadataPage | `apps/web/src/pages/keeper/SelectedKeeperMetadataPage.tsx` | Selected keeper metadata | Unknown |
| V0ShellPage | `apps/web/src/pages/d/V0ShellPage.tsx` | V0 domain shell (`/d/:slug/board`) | Partially Working |
| LegacyDomainRedirect | `apps/web/src/pages/d/LegacyDomainRedirect.tsx` | Legacy redirects to v0 frames | Working (routing only) |
| V0Page | `apps/web/src/pages/V0Page.tsx` | V0 entry point | Unknown |
| StyleEditorPage | `apps/web/src/pages/StyleEditorPage.tsx` | Style editor | Unknown |
| BoardDemoPage | `apps/web/src/pages/BoardDemoPage.tsx` | Demo board page | Unknown |
| LibraryPage | `apps/web/src/pages/LibraryPage.tsx` | Library UI | Unknown |
| CleanSurfaceDoctrinePage | `apps/web/src/pages/manifestos/CleanSurfaceDoctrinePage.tsx` | Manifesto page | Unknown |
| LeadAgentPage | `apps/web/src/pages/LeadAgentPage.tsx` | Dynamic agent page (`/:agentSlug`) | Unknown |
| KipAgentBoardPage | `apps/web/src/pages/kip/KipAgentBoardPage.tsx` | Kip agent board (`/kip`) | Unknown |
| V0 Frames (cover, moment, moments, feed, keepers, journeys, etc.) | `apps/web/src/v0/shell/V0Shell.tsx` + `apps/web/src/v0/frames/*` | Internal v0 shell screens | Partially Working (moment flow only) |
| app-old (legacy) | `apps/web/src/app-old.tsx` | Old app entry | Likely abandoned |

Evidence of placeholder screens (Journeys/Moments):
```1:26:apps/web/src/pages/keeper/KeeperJourneysPage.tsx
<h2 className="text-xl font-semibold text-card-foreground mb-2">Journeys Coming Soon</h2>
```
```1:26:apps/web/src/pages/keeper/KeeperMomentsPage.tsx
<h2 className="text-xl font-semibold text-card-foreground mb-2">Moments Coming Soon</h2>
```

Evidence of V0 frame registry:
```33:48:apps/web/src/v0/shell/V0Shell.tsx
const FRAME_REGISTRY: Record<V0FrameKey, React.ComponentType<any>> = {
  cover: CoverFrame,
  commons: CommonsFrame,
  index: IndexFrame,
  moment: MomentFrame,
  moments: KeptMomentsFrame,
  present: PresentFrame,
  diagnostics: DiagnosticsFrame,
  feed: FeedFrame,
  keepers: KeepersFrame,
  journeys: JourneysFrame,
  profile: ProfileFrame,
  agent: AgentFrame,
  kip: AgentFrame,
  admin: AdminFrame,
}
```

---

## 2. AUTHENTICATION FLOW - Complete End-to-End Trace

### Frontend Components

- `AuthForm` is the single login/register form (toggle by `isRegister`).
- Login/Register pages render `AuthForm`.
- `AuthGate` and `AuthContext` handle session validation and state.

Evidence:
```22:52:apps/web/src/components/AuthForm.tsx
const endpoint = isRegister ? '/api/kam/auth/register' : '/api/kam/auth/login';
const result = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(payload) });
auth.login(result.data);
```
```53:70:apps/web/src/context/AuthContext.tsx
const apiUrl = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
const response = await fetch(`${apiUrl}/api/kam/auth/me`, { method: 'GET', credentials: 'include' });
```
```17:33:apps/web/src/auth/AuthGate.tsx
const response = await fetch(`${apiUrl}/api/kam/auth/me`, { method: 'GET', credentials: 'include' });
```

### API Endpoints

Inline auth handlers in `apps/api/src/index.ts` are labeled as "actual handlers in production".

Evidence:
```700:705:apps/api/src/index.ts
// ⚠️ CRITICAL: These inline auth handlers are the ACTUAL handlers being used in production!
// The handlers in packages/kam/src/auth/*.ts are NOT being used.
```
```706:773:apps/api/src/index.ts
app.post('/api/kam/auth/login', async (req, res) => { ... });
```
```775:855:apps/api/src/index.ts
app.post('/api/kam/auth/register', async (req, res) => { ... });
```
```857:882:apps/api/src/index.ts
app.post('/api/kam/auth/logout', (req, res) => { ... });
```

There is also a separate auth router mounted at `/api/kam/auth`:
```11:17:apps/api/src/kam/auth-routes.ts
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', authWeb, me);
```

### Database

Users are stored in `users` table with hashed passwords.

Evidence:
```701:727:packages/database/prisma/schema.prisma
model users {
  id             String   @id
  email          String?  @unique
  hashedPassword String?
  name           String?
  avatar_url     String?
  ...
}
```

### Passwords / Sessions / Tokens

- Passwords are bcrypt-hashed (`bcrypt.hash`, `bcrypt.compare`).
- JWT is generated and stored as HttpOnly cookie `keeper_session`.
- No sessions table; JWT is stateless.
- Development mode uses localStorage (`keeper_token`, `keeper_user`), production uses cookie-only.

Evidence:
```733:751:apps/api/src/index.ts
const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret', {
  expiresIn: '7d',
});
res.setHeader('Set-Cookie', cookieValue);
```
```31:48:apps/api/src/kam/session.ts
export function setSessionCookie(req: Request, res: Response, token: string) {
  const cookieValue = [
    `${COOKIE_NAME}=${token}`,
    `Domain=${DOMAIN}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    `Max-Age=${maxAge}`
  ].join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}
```
```89:99:apps/web/src/context/AuthContext.tsx
const storedToken = localStorage.getItem('keeper_token');
const storedUser = localStorage.getItem('keeper_user');
```
```198:207:apps/web/src/boot/fetch-shim.ts
if (IS_PROD && api && headers.has('Authorization')) {
  headers.delete('Authorization');
}
if (!IS_PROD && api && !headers.has('Authorization')) {
  const t = localStorage.getItem('keeper_token') || sessionStorage.getItem('keeper_token');
  if (t) headers.set('Authorization', `Bearer ${t}`);
}
```

### Auth Flow Completeness

Findings:

- **End-to-end is partially complete** for login; register appears incomplete.
- **Multiple auth implementations** exist (inline handlers and separate `kam/auth.ts`).
- **Register does not set session cookie** in inline handler, so user is not logged in after register.
- **Cookie SameSite mismatch** between inline handler (`SameSite=Lax`) and session helper (`SameSite=None`).

Evidence of register gap:
```831:846:apps/api/src/index.ts
// Sign JWT
const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'fallback-secret', {
  expiresIn: '7d',
});
return res.status(201).json({ success: true, data: { user: {...}, token } });
```

Assessment:

- Current approach appears cookie-first in production, with bearer fallback for CLI/dev.
- Multiple overlapping implementations suggest churn and risk of divergence.

---

## 3. MOMENTS FEATURE - End-to-End Trace

### Frontend - Capture

Primary authoring UI is in V0 shell:

- `MomentBody` provides draft loading, autosave, and keep actions.
- `KeptMomentsBody` shows list of kept moments.
- Uses `apps/web/src/v0/api/v0Moments.ts` for API calls.

Evidence:
```7:12:apps/web/src/v0/frames/moment/MomentBody.tsx
import { updateDraftMoment, keepMoment, getDraftMoment, claimMoment } from "../../api/v0Moments"
```
```148:166:apps/web/src/v0/frames/moment/MomentBody.tsx
await updateDraftMoment(id, updates, { domainSlug })
```
```195:207:apps/web/src/v0/frames/moment/MomentBody.tsx
const result = await keepMoment(activeDraftId, { domainSlug })
```
```24:26:apps/web/src/v0/frames/moment/KeptMomentsBody.tsx
const data = await getKeptMoments({ domainSlug, limit: 10 })
```

### Backend - Process

Two Moment APIs exist:

1) V0 Moments API (`/api/v0/moments`) – appears active and used by V0 UI.  
2) Domain-Integrated Moments API (`/api/moments`) – newer schema, likely unused by V0 UI.

Evidence (V0 API):
```101:172:apps/api/src/routes/v0/moments.ts
router.get('/', optionalAuthMiddleware, async (req, res) => { ... });
```
```194:248:apps/api/src/routes/v0/moments.ts
router.post('/drafts', optionalAuthMiddleware, domainResolutionMiddleware, async (req, res) => {
  const moment = await prisma.moment.create({
    data: { title: safeTitle, narrative: safeNarrative, ownerId, domainId, ...(ownerId ? {} : { anonKey }) },
  });
});
```

Evidence (Domain-Integrated API):
```191:226:apps/api/src/api/moment/domain-integrated-routes.ts
router.post('/', authMiddlewareCompat, validationMiddleware(createMomentSchema), requireDomainWriteCompat, async (req, res) => {
  const { domainId, keeperId, journeyId, ...momentData } = req.body;
  const moment = await prisma.moment.create({
    data: { ...momentData, domainId, keeperId, journeyId, ownerId: req.user.id },
  });
});
```

**Potential mismatch/gap**: Domain-integrated schema uses `content` but Prisma uses `narrative`. This suggests domain-integrated create may fail or silently drop fields.

Evidence (schema vs API):
```263:287:packages/database/prisma/schema.prisma
model Moment {
  id        String   @id @default(cuid())
  title     String
  narrative String
  ...
}
```
```24:33:apps/api/src/api/moment/domain-integrated-routes.ts
const createMomentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'link', 'file']).default('text'),
  journeyId: z.string().uuid(),
  keeperId: z.string().uuid(),
  domainId: z.string().uuid(),
});
```

### Database - Store

Moments are stored in `Moment` with `title`, `narrative`, `ownerId`, `domainId`, `journeyId`, `pathId`, and `keptAt`.

Evidence:
```263:287:packages/database/prisma/schema.prisma
model Moment {
  title     String
  narrative String
  pathId    String?
  journeyId String?
  ownerId   String?
  domainId  String?
  keptAt    DateTime?
  ...
}
```

### Frontend - Display

Kept moments list is implemented in V0 shell (`KeptMomentsBody`). V0 frames for journeys/keepers/feed are placeholders.

Evidence:
```10:47:apps/web/src/v0/frames/moment/KeptMomentsBody.tsx
if (!moments.length) {
  return <div className="text-sm text-muted-foreground">No kept moments yet.</div>
}
```
```12:33:apps/web/src/v0/frames/journeys/JourneysFrame.tsx
<div>Journey surfaces will render here once the v0 domain board data is connected.</div>
```

### Completeness Rating

- Completeness: **6/10** for V0 Moments (draft + keep + list)
- Completeness: **2/10** for domain-integrated Moments (schema mismatch, unclear UI)

What's missing:
- Domain-integrated API likely broken due to schema mismatch (`content` vs `narrative`).
- No clear UI using `/api/moments`.
- Rich media types (`image`, `video`, etc.) are not supported in V0 UI.
- Moment grid is mock data only.

What's working:
- V0 draft/keep flow with domain-scoped headers.
- Kept moments list in V0 shell.

---

## 4. JOURNEY / KEEPER / DOMAIN HIERARCHY

### Data Model

Schema supports Domain -> Keeper -> Journey -> Path -> Moment.

Evidence:
```34:51:packages/database/prisma/schema.prisma
model Journey { ... keeperId String ... domainId String? ... Moment Moment[] Path Path[] }
```
```53:81:packages/database/prisma/schema.prisma
model Keeper { ... ownerId String ... domainId String? ... Journey Journey[] Path Path[] }
```
```263:301:packages/database/prisma/schema.prisma
model Moment { ... journeyId String? pathId String? domainId String? }
model Path { ... journeyId String keeperId String Moment Moment[] }
```
```919:969:packages/database/prisma/schema.prisma
model Domain { ... keepers Keeper[] journeys Journey[] moments Moment[] }
```

### API Support

Domain-integrated routes exist for keepers, journeys, paths. However, some create handlers appear to use invalid field names.

Evidence of keeper create mismatch:
```181:194:apps/api/src/api/keeper/domain-integrated-routes.ts
const keeper = await prisma.keeper.create({
  data: { ...keeperData, domainId, userId: (req as any).user?.id },
});
```
`Keeper` model expects `ownerId`, not `userId`.

Evidence of journey create mismatch:
```216:230:apps/api/src/api/journey/domain-integrated-routes.ts
const journey = await prisma.journey.create({
  data: { ...journeyData, domainId, keeperId, userId: (req as any).user?.id },
});
```
`Journey` model expects `ownerId`, not `userId`, and uses `name` (not `title`).

### UI Implementation

V0 shell has frames for keepers/journeys but they are placeholders. Keeper pages under `/keeper/:id/*` are also placeholders.

Evidence:
```31:33:apps/web/src/v0/frames/keepers/KeepersFrame.tsx
Keeper listings will render here once the v0 domain board data is connected.
```
```20:25:apps/web/src/pages/keeper/KeeperDashboardPage.tsx
<h2 className="text-xl font-semibold text-card-foreground mb-2">Dashboard Coming Soon</h2>
```

### Assessment

- Schema is complete for hierarchy.
- API exists but likely broken in create flows due to field mismatches.
- UI exists as placeholders, not wired to API.

---

## 5. ABANDONED CODE DETECTION

### Likely Abandoned

- `apps/web/src/app-old.tsx` – old app entry not used.
- `v0 Temp/boards-canvas/*` – experimental Next.js UI with mock data.
- `apps/web/src/components/frames/moment-grid-frame.tsx` – mock data only.

Evidence:
```16:27:apps/web/src/app-old.tsx
console.log('[app-old.tsx] This old app file is rendering!');
```
```54:58:apps/web/src/components/frames/moment-grid-frame.tsx
// Mock moments data
const [moments] = useState<MomentItem[]>([ ... ]);
```
```40:47:v0 Temp/boards-canvas/app/series/page.tsx
interface MediaStory { ... }
```

### Duplicates

- `UserApiKeyManagerPage` appears in both root and settings folders.
- Auth handlers duplicated in `apps/api/src/index.ts` and `apps/api/src/kam/auth.ts`.

Evidence:
```65:67:apps/web/src/App.tsx
import UserApiKeyManagerPage from './pages/UserApiKeyManagerPage';
```
```13:19:apps/api/src/kam/auth.ts
// HttpOnly cookie-based authentication endpoints for KAM
export async function login(...)
```

### Dead Ends / Orphans

- Domain-integrated API routes for journeys/keepers/moments do not match schema fields.
- V0 frames for keepers/journeys/feed are placeholders and do not fetch data.

---

## 6. DEPENDENCY AUDIT

### Unused Dependencies (probable)

- `helmet` is in `apps/api/package.json` but no code imports found.
- `morgan` is in `apps/api/package.json` but no imports found.

Evidence:
```19:36:apps/api/package.json
"helmet": "^7.1.0",
"morgan": "^1.10.0",
```

### Duplicate Dependencies

- `jsonwebtoken` appears in both `dependencies` and `devDependencies` in `apps/api/package.json`.

Evidence:
```33:50:apps/api/package.json
"jsonwebtoken": "^9.0.2",
...
"jsonwebtoken": "^9.0.2",
```

### Deprecated/Outdated

- `node-fetch@2.x` used in proxy; v3+ is recommended (ESM-only).
- `express@4.x` is standard but `express@5` is available (not urgent).

### Missing Dependencies

No obvious missing packages surfaced in spot checks, but some env vars appear mismatched (see Configuration).

---

## 7. THE "CLICK TEST" - Major User Flows

### Flow 1: New User Registration

Steps:
- User hits `/register` -> `RegisterPage` renders `AuthForm`.
- Form submits `POST /api/kam/auth/register`.
- Backend creates user and domain, returns token but **does not set cookie**.
- Frontend calls `auth.login(result.data)` and navigates to `/d/default/board?frame=commons`.
- Subsequent requests rely on cookie; since register did not set cookie, auth likely fails.

Rating: **Partially Working**  
Gaps:
- No session cookie set on register.
- Redirect assumes `/d/default/board` exists and is accessible.

Evidence:
```27:45:apps/web/src/components/AuthForm.tsx
const endpoint = isRegister ? '/api/kam/auth/register' : '/api/kam/auth/login';
```
```831:846:apps/api/src/index.ts
return res.status(201).json({ success: true, data: { user: {...}, token } });
```

### Flow 2: User Login

Steps:
- User hits `/login` -> `AuthForm`.
- Form submits `POST /api/kam/auth/login`.
- Backend validates and sets cookie.
- Frontend sets auth state and navigates to V0 board.

Rating: **Partially Working**  
Gaps:
- Multiple auth handlers; cookie SameSite mismatch may cause cross-domain issues.
- Cookie-based auth is strict; dev localStorage auth is only in dev.

Evidence:
```733:751:apps/api/src/index.ts
res.setHeader('Set-Cookie', cookieValue);
```

### Flow 3: Create a Moment

Steps:
- User in `/d/:slug/board` (V0 shell).
- `MomentBody` creates or updates draft via `/api/v0/moments/drafts`.
- `keepMoment` publishes via `/api/v0/moments/:id/keep`.
- Kept moments list fetched via `/api/v0/moments` with `x-domain-slug`.

Rating: **Working (V0 only)**  
Gaps:
- Domain-integrated API not wired to UI.
- Media types in UI not supported.

Evidence:
```118:131:apps/web/src/v0/api/v0Moments.ts
const url = `${API_BASE_URL}/api/v0/moments/drafts`;
```
```406:448:apps/api/src/routes/v0/moments.ts
router.post('/:id/keep', optionalAuthMiddleware, async (req, res) => { ... });
```

### Flow 4: View Journeys/Keepers

Steps:
- User navigates to `/keeper/:id/journeys` or `/d/:slug/board?frame=journeys`.
- Both UI surfaces are placeholders, no data fetch.

Rating: **Broken**  
Gaps:
- No actual API wiring.
- Domain-integrated API create flows appear broken due to field mismatches.

Evidence:
```31:33:apps/web/src/v0/frames/journeys/JourneysFrame.tsx
Journey surfaces will render here once the v0 domain board data is connected.
```

---

## 8. AI INTEGRATION (KIP) - What Exists?

### Frontend

- KIP pages exist under `/studio/kip/*` and `/kip`.
- `kipApi.ts` provides agent CRUD and run calls.
- UI supports mock response if API fails.

Evidence:
```567:606:apps/web/src/lib/kipApi.ts
static async runAgent(...) {
  const response = await apiFetch('/api/kip/agents', { method: 'POST', body: JSON.stringify({...}) });
  ...
  // Return mock execution result
}
```

### Backend

- KIP agent endpoints implemented in `apps/api/src/api/kip/agents.ts`.
- Model provider abstraction exists (`ModelProviderService`) with OpenAI support.
- Engagement executor exists under `/api/engagement/execute`.

Evidence:
```1:6:apps/api/src/api/kip/agents.ts
 * Handles KIP (Keeper Interface Protocol) agent operations
```
```1:16:apps/api/src/services/ModelProviderService.ts
 * Abstraction layer for AI model providers (OpenAI, Anthropic, Together, ElevenLabs)
```
```133:162:apps/api/src/services/ModelProviderService.ts
class OpenAIProvider { ... openai.chat.completions.create(...) }
```
```1:71:apps/api/src/api/engagement/execute.ts
 * Engagement Template Execution API
router.post('/execute', authMiddlewareCompat, async (req: Request, res: Response) => { ... });
```

### Assessment

- AI integration appears substantial on backend; frontend uses it but includes mock fallback.
- No direct AI action that creates Moments found; KIP actions are separate and complex.
- Likely functional for agent runs if API keys are configured.

Minimum viable AI:
- Run agent with OpenAI provider via `/api/kip/agents` using platform/user keys.

---

## 9. MEDIA STORIES - Does this exist?

Findings:

- Media-story UIs exist only in `v0 Temp/boards-canvas/*` with mock data.
- A `MomentGridFrame` shows mock media cards but is not wired to API.
- No database model or API endpoints specific to Media Stories found.
- No `YouTube` references found in codebase.

Evidence:
```40:48:v0 Temp/boards-canvas/app/series/page.tsx
interface MediaStory { ... }
```
```54:58:apps/web/src/components/frames/moment-grid-frame.tsx
// Mock moments data
const [moments] = useState<MomentItem[]>([ ... ]);
```

Assessment: **Planned / conceptual only**.

---

## 10. SOLE MEMORY - Does this exist?

SOLE memory is implemented as its own backend system with routes and schema models.

Evidence:
```1:8:apps/api/src/api/memory/sole-memory-routes.ts
 * SOLE Memory API Routes
```
```13:35:apps/api/src/services/SoleMemoryService.ts
 * SOLE Memory Service
 * Handles Self-Organizing Learning Environment memory pattern logic
```
```902:915:packages/database/prisma/schema.prisma
model SoleLogbookEntry { ... }
```

Assessment:
- **Exists and likely functional** as a backend subsystem.
- **No direct Moment integration** found; separate feature.

---

## 11. PROXY / CORS / AUTH INFRASTRUCTURE ARCHEOLOGY

### A. CORS & Proxy Configuration

Evidence (API CORS):
```196:310:apps/api/src/index.ts
app.use(cors(corsOptions));
```

Evidence (Proxy service):
```19:27:apps/proxy/src/index.ts
const PROXY_ENABLED = String(process.env.KEEPER_PROXY_ENABLED || "false").toLowerCase() === "true";
if (!PROXY_ENABLED) { process.exit(0); }
```

### B. Auth Token / Cookie Strategy Audit

Methods found:

1) HttpOnly cookie: `keeper_session` (production).
2) LocalStorage token: `keeper_token` (dev only).
3) Authorization header Bearer token (CLI/non-browser).

Evidence:
```198:207:apps/web/src/boot/fetch-shim.ts
if (IS_PROD && api && headers.has('Authorization')) headers.delete('Authorization');
if (!IS_PROD && api && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${t}`);
```
```67:91:apps/api/src/kam/session.ts
const cookieToken = readCookieToken(req);
const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
const allowHeader = !origin || cliHeader;
const token = cookieToken || (allowHeader ? headerToken : '');
```

### C. API Base URL Configuration

Found base URLs:

- `apps/web/src/lib/apiFetch.ts` uses `VITE_API_URL` fallback `https://api.ke3p.com`.
- `apps/web/src/v0/api/v0Moments.ts` defaults to `http://localhost:3002`.
- `apps/web/vite.config.ts` proxies `/api` to `http://localhost:3001`.
- Vercel rewrites `/api/*` to Railway production.

Evidence:
```10:17:apps/web/src/lib/apiFetch.ts
const RAW_BASE = ((import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com').replace(/\/$/, '');
```
```1:3:apps/web/src/v0/api/v0Moments.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
```
```45:49:apps/web/vite.config.ts
proxy: { '/api': { target: 'http://localhost:3001', changeOrigin: true } }
```

### D. Backend CORS Configuration

Express CORS middleware is configured in `apps/api/src/index.ts` with allowlists and credentials.

Evidence:
```267:304:apps/api/src/index.ts
const corsOptions = { origin: ..., credentials: true, methods: [...], allowedHeaders: [...] };
```

### E. Network Request Patterns

Login and auth use `credentials: 'include'` and cookie-only in prod, bearer in dev.
Moments use V0 endpoints with `x-domain-slug` and `x-anon-key`.

Evidence:
```121:131:apps/web/src/v0/api/v0Moments.ts
const headers = buildDomainHeaders({ domainSlug: options.domainSlug });
```

### F. Proxy Configuration Check

Proxy service exists but exits early unless `KEEPER_PROXY_ENABLED=true`. Vite dev proxy is active for `/api`.

### G. Environment-Specific Logic

- AuthContext and fetch-shim branch based on `import.meta.env.PROD`.

### H. Verdict

Current Strategy Appears To Be:

- Auth Method: **Cookie-based in production, token fallback in dev/CLI**.
- Frontend calls backend at: **`VITE_API_URL` or Vercel rewrite**.
- Auth is sent via: **HttpOnly cookie + credentials include**.
- CORS is configured: **in `apps/api/src/index.ts` with allowlist + preview support**.
- Proxy is: **Configured but disabled by default**.

Legacy/Abandoned Attempts Found:
- Proxy service (`apps/proxy`) disabled by default.
- Domain-integrated APIs appear mismatched with schema.

Known Issues/Inconsistencies:
- `SameSite` mismatch between `session.ts` and inline auth handlers.
- `VITE_API_URL` is required but `apps/web/.env.production` uses `VITE_API_BASE_URL`.

Assessment: **Multiple competing approaches causing issues**.

---

## 12. CONFIGURATION CHAOS CHECK

### .env files found

- `.env.example`
- `.env.old`
- `apps/api/.env`
- `apps/api/.env.test`
- `apps/web/.env`
- `apps/web/.env.production`
- `packages/database/prisma/.env.bak`
- `env-example.txt`

### Conflicts / Missing Vars

- `apps/web/.env.production` sets `VITE_API_BASE_URL`, but code uses `VITE_API_URL`.
- `VITE_API_URL` is a critical var referenced in multiple files.

Evidence:
```10:17:apps/web/src/lib/apiFetch.ts
const RAW_BASE = ((import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com').replace(/\/$/, '');
```
```1:1:apps/web/.env.production
VITE_API_BASE_URL=https://keeper-platform-production.up.railway.app
```

### Hardcoded Configuration

- `apps/web/src/App.tsx` hardcodes `https://api.ke3p.com/api/health`.

Evidence:
```127:135:apps/web/src/App.tsx
const endpoint = 'https://api.ke3p.com/api/health';
```

---

## 13. BUILD & DEPLOY REALITY CHECK

### Frontend Build

- Uses Vite (`apps/web`), build command in `vercel.json` is `pnpm build`.
- Not executed in this audit.

Evidence:
```2:4:vercel.json
"buildCommand": "cd apps/web && pnpm build",
"outputDirectory": "apps/web/dist",
```

### Backend Build

- API built via `tsc`; Railway start runs migrations and starts `apps/api/dist/index.js`.

Evidence:
```7:10:railway.json
"startCommand": "sh -c 'pnpm --filter @keeper/database prisma migrate deploy && ... && node apps/api/dist/index.js'",
```

### Deploy Configs

- `vercel.json` rewrites `/api/*` and `/mcp/*` to Railway.
- Proxy has separate `railway.json` but service is disabled by default unless env enables.

---

## 14. THE FRANKENSTEIN REPORT

Features 80% built:
- **V0 Moments**: full draft/keep flow, but no link to modern API and no media support.
- **KIP**: robust backend and client SDK, but UI integration and action wiring unclear.

Multiple ways to do the same thing:
- **Auth**: inline auth handlers + `kam/auth.ts` + package-level `packages/kam/src/auth`.
- **Moments**: V0 endpoints vs domain-integrated endpoints.

Dead ends:
- V0 frames for keepers/journeys/feed are placeholders.
- Moment grid frame shows mock data only.

Orphaned code:
- `app-old.tsx`, `v0 Temp/boards-canvas/*`.

Inconsistent patterns:
- Some routes use `ownerId`, others set `userId`.
- Schema uses `narrative`, API uses `content`.

---

## 15. FINAL VERDICT - What Actually Works Right Now?

Based on code inspection only:

Appears Working:
- V0 Moments draft/keep/list (cookie or anon key).
- Auth login (cookie set on login).

Partially Working:
- Registration (does not set cookie).
- KIP agent runs (requires API keys, fallback to mock on frontend).
- Domain / board shell navigation (routing present, data uncertain).

Broken/Incomplete:
- Domain-integrated Moments (schema mismatch).
- Keeper/Journey UI (placeholders).
- Keeper/Journey create APIs (field mismatches).

Unknown/Unclear:
- Board Studio / Admin / Domains management.
- Engagement templates and other studio modules.

Should Probably Delete:
- `app-old.tsx`
- `v0 Temp/boards-canvas/*`
- Duplicate `UserApiKeyManagerPage` (legacy copy)

---

## 16. RECOMMENDATIONS FOR 2-WEEK MVP

Keep and finish:
- V0 Moments (ship draft + keep + list).
- Login flow (cookie-based).
- One stable domain landing shell (`/d/:slug/board`).

Cut completely:
- Media Stories (`v0 Temp/boards-canvas/*`).
- Unused proxy service (unless a real use case exists).

Cleanup before launch:
- Resolve auth duplication; pick one implementation and delete the rest.
- Fix `VITE_API_URL` vs `VITE_API_BASE_URL`.
- Align domain-integrated APIs with Prisma fields or remove them.

Critical blockers:
- Registration flow does not establish session cookie.
- Keeper/Journey create APIs appear broken (field mismatches).
- Multiple auth implementations increase risk of regressions.

Suggested focus:
- Stabilize auth (register/login/logout/me).
- Decide on one Moments API (V0 vs domain-integrated) and make UI align.
- Remove or archive placeholder UIs to reduce confusion.

