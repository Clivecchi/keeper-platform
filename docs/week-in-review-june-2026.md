# Keeper Platform — Week in Review

**Period:** June 21–28, 2026  
**Branch:** `cloud`  
**Audience:** Chuck Livecchi · Kip · Cloud · Cursor agents  
**Purpose:** Combine work from multiple Cursor sessions into one picture — what shipped, what is in progress, what is next, and how Realm fits.

---

## Executive summary

This week moved Keeper from **mock domain data** toward **real personal realms on the Universal Board**. The Domain Picker loads live domains from the API. Chuck's personal domain (`chuck-livecchi`) was repaired and confirmed navigable. Agent Board scoping was fixed so personal realms no longer show the full platform agent registry or IDE key cabinet. A first **AI Access** model (included vs yours) and **tier flags** (Free / Keeper / Studio) were wired as the foundation for pricing.

Parallel work continued on **Kip reliability**, **mobile/UI polish**, **Chronicle/Dialog diagnostics**, **GitHub service bindings** (so Cloud sees the right repo/branch), and **domain provisioning** (Step 1.2). **Realm Board** was specified and planned — explicitly **not built yet** — as Phase 4 after Phases 1–3.

A cross-cutting **Financial** layer (budget awareness for Vercel, Railway, AI providers, etc.) was **designed but not built** — manual budget config plus error-based “depleted” detection first; live spend APIs only where vendors expose them later.

---

## What was accomplished

### 1. Domain Picker — Phase 1.1 (shipped)

| Item | Status |
|------|--------|
| Remove `MOCK_DOMAINS` from Domain Board | Done |
| Live fetch from API (`GET /api/domains/my` — owned + permitted domains) | Done |
| Domain selection navigates to `/d/:slug/board?board=domain` | Done |
| Chronicle reloads via `DomainFocusPresence` on slug change | Confirmed wired |
| Switcher overlay via `createPortal` + fixed positioning (no clip) | Done |
| Readable ink on dark board theme (`domainSwitcherTheme.ts`) | Done |
| Redis cache heal when owned domains missing from user-domain list | Done (`DomainService`) |

**Commits:** `Domain Picker`, `picker too`, `Pickerr working`, `key 1` (switcher + add panel foundation)

**Verification:** Direct navigation to `chuck-livecchi` confirmed working. Picker overlay fixes may need deploy to validate in production UI.

---

### 2. Personal realm repair (one-time + model clarity)

| Item | Status |
|------|--------|
| Create `chuck-livecchi` domain | Done (repair script) |
| Set `users.primaryDomainId` | Done |
| Seed PersonalKeeper + permissions | Done |
| Clarify: personal domain vs KE3P are same **schema**, different **meaning** (`primaryDomainId`) | Documented in sessions |

**Known presentation gap:** Empty `frame_json` on personal domain → platform `DEFAULT_FRAME_FALLBACK` shows KE3P/Kip branding in top bar and dialog center. Chronicle correctly shows domain record. Realm frame authoring is future work.

---

### 3. Domain creation — Phase 1.2 (partial)

| Item | Status |
|------|--------|
| `DomainAddPanel` + "Add a domain" from switcher | Done (committed) |
| `POST /api/domains` wired | Done |
| Navigate to new slug on success | Done |
| `provisionDomainOnCreate` — lead agent, frame_json, keeper, primaryDomainId, home board | **Implemented — may be uncommitted** (`apps/api/src/services/domains/`) |
| `POST /api/domains/:id/provision` repair route | **Implemented — may be uncommitted** |
| Signup path uses same provisioner | In progress / partial |
| Onboard UI to repair legacy domains | Not built |

**Commits:** `domain deploy dialog` (experience context + dialog tweaks); provisioning service folder added in working tree

**What provisioner does (when wired):**
1. Creates `{slug}-lead` Kip agent (Lead role) or reuses if present; sets `settings.primaryAgentId`.
2. Writes `frame_json` when empty — domain wordmark, tagline, `kip.agent_id`, agent board messaging.
3. Creates default Keeper (`DomainKeeper`) when none exists.
4. Sets `users.primaryDomainId` when unset.
5. Calls `ensureDomainHomeBoard`.

---

### 4. Agent Board — domain scoping (shipped)

**Problem:** Personal realm Agent nav showed global platform agents (Cloud, Rendr, Desk, Coordinator, Kip) and IDE-style platform keys.

**Fixes:**

| Surface | Before | After |
|---------|--------|-------|
| Agents nav | `GET /api/agents?domainId=` (ignored domainId) | `GET /api/domains/:domainId/kip/agents` |
| Agent list | Full platform registry | Domain lead (when not Kip) + Kip |
| Keys / Connections | Copied from IDE Board | Removed from Agent Board |
| IDE Board | — | Still hosts full Keys + AI Providers registry |

On `chuck-livecchi` today: **Kip only** until a domain lead agent is assigned/provisioned.

---

### 5. AI Access & key tier model (shipped)

Product model agreed and partially encoded:

```
Runtime (hidden)              What the domain owner sees
────────────────────          ────────────────────────────
1. Domain-owned key (BYOK) →  "Yours"
2. Shared / tier grant       →  "Included" (never the secret)
3. Platform fallback (free)  →  "Included" (feels like capacity)
```

| Layer | Change |
|-------|--------|
| Agent Board nav | New **AI Access** section — e.g. "2 included · 1 yours" |
| `DomainAiAccessNav` | Soft summary; not the four-row IDE key registry |
| Key cover | Shows **Access: Included / Yours** — never raw `PLATFORM` |
| `@keeper/shared` `domainTier.ts` | `free` / `keeper` / `studio` tier flags |
| Tier policy | Free = included only; Keeper+ = BYOK allowed |
| `GET /api/domains/:domainId/key-access` | Tier + synced Key presence for nav |
| `ModelProviderService` | Tier-gated resolution when `domainId` passed |
| `POST /api/keys` (user source) | 403 on Free tier (`TIER_BYOK_UNAVAILABLE`) |
| New domains | Default `settings.tier: 'free'` on create |

**Commits:** `key 1`, `key2`, `key 3`

**Principles locked:**

- Technically shared, experientially private
- Domain keys override included access
- Nav shows summary, not platform infrastructure
- Pricing tiers attach to **what resolves**, not what gets listed

---

### 6. Kip & Dialog reliability (ongoing through the week)

| Item | Notes |
|------|-------|
| Provider error handling | Improved taxonomy and user-facing errors (`QUOTA_EXCEEDED`, overload, timeout) |
| Draft trigger narrowing | More reliable `sole.save` vs draft conditions |
| Unsupported action receipts | Hidden/skipped when agent claims unsupported actions |
| Kip Lead self-heal on slug load | Heals missing Lead agent records |
| Post-login sign-in URL fix | Redirect cleanup |
| Echo / diag tooling | Debug overlays and diagnostic commits (`echo`, `diag`, `Diag 34`) |
| Action receipt uplift | Rich Journey/Path/Moment receipt cards (committed earlier); **image.generate → Keep as Moment** in working tree |
| `buildExperienceAgentContext` | Injected agent context for domain board dialog (commit `domain deploy dialog`) |

**Open:** Center panel "Dialog ran into a problem" on some paths — reported, not fully investigated this week.

---

### 7. Mobile & UI polish (parallel agents)

Commits across the week: mobile layout fixes, turtle icon, UI story improvements, composer/debug toolbar work, Chronicle readability. These sessions were largely orthogonal to Domain/Realm work but improved production UX on small screens and narrative surfaces.

**Commits (sample):** `mobile updates 4`, `More Mobile Fixes`, `mobile ico`, `UI Improvement`, `UI Story IMprovememnt`, `TURTLE ICO`

---

### 8. Integration Chronicle — GitHub service binding (shipped)

**Commit:** `Diag 34` (`d9f50bfe`)

Binding answers *which repo and branch* Cloud and Chronicle use — separate from OAuth connection and display labels.

| Layer | What |
|-------|------|
| **Shared** | `packages/shared/src/serviceBindings.ts` — types, validation, field defs |
| **API** | `resolveServiceBinding.ts` — resolver; persists to `domain.settings.serviceBindings.github` + syncs legacy `ideBuildContext` |
| **API** | `PATCH /api/integrations/github?domainId=` accepts `{ binding: { repository, defaultBranch } }` |
| **API** | GitHub MCP tools default repo/branch from domain binding when Cloud omits them |
| **API** | `buildKipEnvironmentContext` injects `infraBindings.github` |
| **Web** | `ServiceBindingConfigPresence` — Chronicle **Manage** on connected GitHub (repo + branch) |
| **Web** | Manage button on GitHub cover; feed reads binding chain: integration metadata → domain settings → env default |

**Resolution order:** `serviceBindings.github` → `ideBuildContext` → `integration.metadata.binding` → env default.

This is **platform building** work (IDE-adjacent). It does not replace Domain/Realm onboarding — it fixes “Cloud is on the wrong repo.”

---

### 9. Financial layer — specified, not built

Multiple sessions discussed **budget depletion** causing odd errors (Vercel, Railway, Anthropic, etc.). Agreed direction:

| Approach | Pull from vendor? |
|----------|-------------------|
| **F1 — Manual budget config** | **No** — you set allowance, warning %, renewal date, billing portal URL on Keeper's side |
| **F1 — Error signature classification** | **Inferred** — classify failures as likely `BUDGET_DEPLETED` vs auth vs binding vs transient (extends existing AI `QUOTA_EXCEEDED` pattern) |
| **F2 — Agent surfacing** | Cloud reads `infraFinancial` status; explains budget vs auth vs binding on failure |
| **F3 — Provider usage APIs** | **Selective** — only where APIs exist (AI usage first; Vercel/Railway often dashboard-only) |

**Important:** F1 is **not stub text** — it is honest manual config plus smart error interpretation. Live spend numbers come later, per vendor, and UI must label source (Manual / Inferred / Live).

Parallels **service binding** pattern: fourth layer after Connection · Binding · Presentation.

---

## What remains to develop

### Phase 1 — Singular UI / Universal Board (in progress)

| Step | Item | Status |
|------|------|--------|
| 1.1 | Live Domain Switcher | **Mostly done** — confirm picker in production after deploy |
| 1.2 | Domain create + default lead agent + keeper seed + `primaryDomainId` | **Partial** — provisioner written; commit + signup/onboard repair UI pending |
| — | Repair legacy domains via onboard UI → `POST /api/domains/:id/provision` | API ready; UI not built |
| — | Author personal `frame_json` (stop KE3P branding bleed) | Not built |
| — | Engagement Templates on Board (Nav triggers, Chronicle acts) | Ongoing Phase 1 |
| — | Present / public singular UI | After board engagement |
| — | Theme creation UI | Phase 1 gap |
| — | Vercel / Railway service bindings (like GitHub) | Not started |
| — | Financial F1 (manual budget + error classification) | Spec only |

### Phase 2 — Pool Keeper (not started)

Proof of concept on working platform. Do not build while Phase 1 incomplete.

### Phase 3 — Generation Keeper / livecchi.us (not started)

First production instance. Depends on Phase 1–2.

### Phase 4 — Realm Board (specified, not built)

See **Understanding Realm** below. Hard gate: Phases 1–3 deliverables.

### Keys & tiers — next slices

| Item | Notes |
|------|-------|
| Billing / upgrade UI | Tier stored in `settings.tier`; no checkout yet |
| Cross-domain shared pool | `allowSharedPool` flag reserved on Studio tier |
| Chronicle guard on included keys | No rotate/reveal — status only |
| Domain Board AI Access block | Optional same summary as Agent Board |
| Explicit tier seed for Chuck's domains | `chuck-livecchi` = free, `default` = studio (slug fallback works today) |

### Known issues / debt

| Issue | Detail |
|-------|--------|
| Dialog crash | "Dialog ran into a problem" — separate from picker work |
| `frame_json` empty on personal domain | Platform fallback branding in center/top bar |
| Registration gap | Signup may not yet call full `provisionDomainOnCreate` everywhere |
| Agent delivery UX | Kip narrates success without showing deliverable — product principle flagged |
| Role matrix bug | `GET /api/admin/roles/users` returns empty roles — documented debt |
| Budget errors masquerading as auth/config | No Financial layer yet — AI quota partially handled |

### Uncommitted work in tree (as of June 28)

Worth consolidating before next deploy:

| Area | Files / notes |
|------|----------------|
| Domain provisioner | `apps/api/src/services/domains/*` (orchestration + frame JSON builder + tests) |
| Domain routes | Further `routes.ts` / `index.ts` signup wiring |
| Action receipts | `ActionReceiptCard.tsx`, `UniversalConversation.tsx` — image → Keep as Moment |
| Dialog | `DialogueMessageList.tsx`, `KeeperDialogFrame.tsx` tweaks |

---

## Understanding Realm

### One sentence

**Four boards are where you work on a domain. Realm is where you live in it.**

### The five boards

| Board | Purpose | Mode |
|-------|---------|------|
| IDE | Building | Platform workspace |
| Agent | Thinking | Conversation + agents |
| Design | Shaping | Frame / board definition |
| Domain | Managing | Domain operations, feed, switcher |
| **Realm** | **Being** | Inhabited place — not admin |

**Domain Board** = managing your domain (switcher, feed, operations).  
**Realm Board** = being in your domain (identity, presence, audience layers, growth over time).

In product language this week: **domain** is the data record everyone shares; **realm** is the inhabited experience of *your* domain — especially the personal one (`chuck-livecchi`, future `livecchi.us`). Code today mostly says "domain"; Realm is the **future fifth board** (`?board=realm`), not a rename of Domain Board.

### What makes Realm different

1. **Nascent Nav** — sections appear only when there is something real to show (no empty scaffolding).
2. **Three audience layers** — Public / Friends / interior views (who sees what).
3. **Agent graduation** — platform Kip helps you arrive; over time your **domain lead agent** becomes the voice (not the global Kip registry).
4. **Easy onboarding** — guided arrival, seed questions, first Dialog — Realm is the destination of onboarding, not a settings page.
5. **Reuses Universal Board** — same Nav · Dialog · Chronicle shell; different board definition, nav blocks, and presence — not a new layout system.

### What Realm is not

- Not a rename of Domain Board (Domain Add panel placeholders intentionally say "domain", not "realm")
- Not a standalone `?frame=*` route — follows Singular UI (`?board=realm` when built)
- Not buildable yet without Phase 1–3 foundations
- Not the IDE key registry or platform agent list — those stay on IDE / platform `default`

### Gates before Realm (from handoff)

| Phase | Deliverable | Why Realm needs it |
|-------|-------------|-------------------|
| **1.1** | Live Domain Switcher | Realm nav always shows switcher |
| **1.2** | Domain creation + default lead agent | Every realm starts from a created domain |
| **2.1** | Guided arrival — Kip on new domain | First Dialog, onboarding |
| **2.2** | Draft accumulation + point → Journey/Moment promotion | Nav grows with content |
| **2.3** | Domain lead agent assignment / graduation pattern | Realm voice is domain agent, not platform Kip |
| **3.x** | Present / public story surfaces | Public layer of three views |

**Recommendation:** Continue Phase 1 (finish 1.2, frame authoring, engagement templates). Do **not** start `?board=realm` until gates above are met.

### Realm in Keeper terms (Chuck's model)

| Concept | Meaning |
|---------|---------|
| **KE3P (`default`)** | Platform domain you **operate** — Studio tier, building workspace |
| **Personal realm (`chuck-livecchi`, future `livecchi.us`)** | Where **you** live as Keeper — `primaryDomainId` points here |
| **Same database** | Both are `Domain` rows; difference is pointers, tier, and authored `frame_json` |
| **Presentation bleed today** | Empty personal frame → platform defaults until realm is authored |
| **Tier / AI Access** | Realm-facing nav shows soft "Included / Yours" — not platform infrastructure |

### How this week's work relates to Realm

| This week | Realm connection |
|-----------|------------------|
| Domain Picker + `primaryDomainId` | You can **switch into** your personal realm |
| Step 1.2 provisioner | Seeds **lead agent + frame_json** — prerequisites for graduation |
| Agent Board scoping + AI Access | Personal realm **feels owned**, not like the platform IDE |
| GitHub binding | Platform ops for Cloud — **not** Realm UX, but keeps build/deploy honest |
| Realm Board itself | **Not started** — still Phase 4 |

---

## Workstreams by agent (Cursor sessions)

Multiple agents touched the same branch. Grouped by theme:

| Workstream | Primary focus | Key artifacts |
|------------|---------------|---------------|
| **Domain Picker agent** | Step 1.1, switcher, cache heal, repair script | `DomainBoard.tsx`, `domainSwitcherData.ts`, `DomainService.ts` |
| **Domain provision agent** | Step 1.2 seeding | `provisionDomainOnCreate.ts`, `buildInitialDomainFrameJson.ts` |
| **Agent Board agent** | Domain-scoped nav, AI Access summary | `UniversalNavPanel.tsx`, `UniversalBoardDefinition.ts`, `DomainAiAccessNav.tsx` |
| **Keys / tier agent** | Included vs yours, tier flags | `domainTier.ts`, `key-entity-routes.ts`, `ModelProviderService.ts` |
| **Kip reliability agent** | Errors, drafts, self-heal, receipts | `agents.ts`, `ActionReceiptCard.tsx`, provider errors |
| **Mobile / UI agent** | Responsive, icons, story UI | Various web components, CSS |
| **Integration / binding agent** | GitHub repo+branch Manage, MCP defaults | `serviceBindings.ts`, `ServiceBindingConfigPresence.tsx`, `resolveServiceBinding.ts` |
| **Financial planning agent** | Budget layer spec | Design only — no code |
| **Realm planning agent** | Handoff doc, phase gates | Plan only — Phase 4 |
| **Diag / echo agent** | Composer debug, dialog instrumentation | `ComposerDebugToolbar`, `KeeperDialogFrame` |

**Coordination note:** Domain Picker and Keys/tier work are complementary. Agent Board scoping must stay aligned: **IDE = full registry**, **Agent/Domain = soft AI Access only**. Service binding and Financial layers are **platform ops** surfaces — distinct from Realm "being" UX.

---

## Suggested next steps (priority order)

1. **Commit and deploy** uncommitted provisioner + dialog/receipt work on `cloud`; confirm Domain Picker + AI Access + GitHub Manage in production on `chuck-livecchi`.
2. **Finish Step 1.2** — run `POST /api/domains/:id/provision` on Chuck's personal domain; verify lead agent + `frame_json` seed.
3. **Investigate Dialog crash** — separate blocker from picker.
4. **Author personal `frame_json`** — reduce KE3P branding bleed on personal realm.
5. **Continue Phase 1 engagement templates** on Universal Board (Nav triggers, Chronicle acts).
6. **Financial F1** (when ready) — manual budget fields on Anthropic/Vercel + error classification; Cloud surfaces depleted state.
7. **Hold Realm Board** until Phase 1.2 + 2.1–2.3 gates are met.

---

## Reference URLs

| Surface | URL |
|---------|-----|
| Domain Board + picker | `https://ke3p.com/d/default/board?board=domain` or `/d/chuck-livecchi/board?board=domain` |
| Agent Board | Same slug + `?board=agent` |
| IDE Board (full keys + GitHub Manage) | Same slug + `?board=ide` |
| Local dev | `http://localhost:5173` |

---

## Canonical docs to keep aligned

| Document | Role |
|----------|------|
| `AGENTS.md` | Platform index, phase status, agent rules |
| `docs/keeper-heart-mind.md` | Data model |
| `docs/keeper-ui-experience.md` | Surfaces, frames, board |
| `docs/entitykind-implementation-recipe.md` | Cover · Chronicle · Config · Nav |
| Realm Board Handoff (June 2026) | Chuck's vision — Phase 4 spec (conversation artifact) |

---

*Compiled June 28, 2026 from git history on branch `cloud`, folder READMEs, and Cursor agent sessions. This document is summary only — no code changes.*
