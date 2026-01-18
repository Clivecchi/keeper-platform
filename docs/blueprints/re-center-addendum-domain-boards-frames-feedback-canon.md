# Re-Center Addendum — Domain Boards, Frames, Feedback, and Canon

## Purpose of this Addendum
Support the **primary Re-Center Blueprint** by capturing **evidence-based discoveries** from live testing + code/DB inspection, and turning them into **canonical decisions** and **next steps**.

This addendum is a **protector**:

* Protect working code and existing domain functionality (custom domain → Vercel, members, policies, keys).
* Prevent accidental “second system” rewrites (duplicate domain boards, duplicate domain settings UI).
* Keep the MVP loop intact while we move the remaining surfaces into **v0**.

---

## State Assessment (Evidence-Based)

### 1) MVP Loop is real (functionally)

**Draft lifecycle works** (autosave → draft exists).
**Keep works** (draft → kept).
**Proof surface exists** (Kept Moments list shows kept items).

Current issue is not “can we keep” — it’s **navigation coherence** + **surface alignment**.

### 2) Feedback at bottom of Moment is NOT agent-driven

What looked like an “agent message” is actually **inline frame UI state** inside the Moment frame.

* Component: `apps/web/src/v0/frames/moment/MomentBody.tsx`
* Render type: inline UI (not toast, not SSE/WebSocket, not agent)
* Driven by local React state: `isKept`, `isSaving`, `lastSaved`, `saveError`, `content`

**Canonical conclusion:**

> “Feedback” is a **Frame Primitive** (structural behavior), not an agent feature.

### 3) Trail exists, but is currently a visual/UX mismatch

Trail is functioning (events appear; navigation buttons exist), but:

* It is not yet “v0-cohesive.”
* It risks becoming a **side-quest** if we style it before we place it correctly in the Domain → Board → Frame experience.

**Canonical stance:**

> Trail is a **secondary primitive**. Keep it functional, defer polish until the Domain Board contract is in place.

### 4) Domain functionality is already significant and must be protected

The **old UI** under `/root` and domain manager components already provide working capabilities:

* Profile updates
* Domain settings
* Domain members
* Custom domain setup / verification (Vercel integration)
* Personal API keys
* Domain policy editing (via `/d/:slug/admin`)

**Non-negotiable:**

> v0 styling must not break these flows. We will wrap / re-surface, not rewrite blindly.

---

## Canonical Model (Locked)

### Domain → Board → Frame → (Primitives + Props)

* **Frames** are the unit of experience.
* **Primitives** = structural behaviors (save feedback, nav controls, trail events, diagnostics, auth gates).
* **Props** = content payloads inside frames (text, media, forms, lists).

### “Frame Props” vs “Frame Primitives” (resolved language)

**Frame Props** (old Design Board “Props Library” concept):

* Content elements placed into a frame (Heading, Text Block, Image Gallery, Form, etc.).

**Frame Primitives** (system behaviors):

* Navigation + breadcrumbs/trail
* Save/keep feedback rail
* Auth-required actions and state
* Domain-scoped header resolution
* Diagnostics capture

**They are different.**
Props are “what is in the frame.”
Primitives are “how the frame behaves.”

---

## Board Canonization Decision (Critical)

### Problem discovered

There are **multiple “domain board” candidates** in code and DB, and it’s easy to accidentally build a second system:

* A template “Domain Design Board” exists (`domain-design-board-template`).
* A non-template “Domain Management Board” exists in DB (`slug=domain-management`).
* The intended ensure-path for a per-domain home board (`boardType="domain-home"`) has not been realized in DB.

### DB evidence

* `Domain Design Board` (template) exists: `slug=domain-design-board-template`, `isTemplate=true`.
* `Domain Management Board` (non-template) exists: `slug=domain-management`, `isTemplate=false`.
* **No boards with** `boardType=domain-home`.
* **No** `BoardAlias` rows for `domain-board-1`.

### Canonical decision

> **Every domain must have a default board:** `boardType = "domain-home"`.

Why:

* `slug=domain-management` is **not per-domain** by definition (it’s a global slug).
* `boardType="domain-home"` is the simplest canonical guarantee that **Domain → Board** is real for every domain.
* It preserves future flexibility: other boards can exist, but this board is the “home.”

**Rule:**

* Do not create a second “domain home” concept.
* If a board already exists for a domain, adopt and migrate, don’t duplicate.

---

## Design Frame Contract (Protected, First-Class)

This addendum confirms the Blueprint’s stance:

The **Design Frame** is not “later.”
It is the surface that:

* establishes and enforces **v0 structural grammar**
* applies themes correctly
* enables cohesive frames beyond Moment

**MVP stance:** Keep it visible, aligned, and intentionally scoped.

---

## Inventory: Working Surfaces We Must Not Break

### Old UI (functional) — `/root`

* Root dashboard tabs: Profile, Domain Settings, Personal API Keys
* Domain management: members, custom domain verification, etc.

### Domain Admin (functional) — `/d/:slug/admin`

* Domain policy view/edit

### v0 Public + Frame surfaces (working exemplar)

* Moment frame: draft → save → keep
* Kept Moments: proof surface

---

## Next Steps (No Guessing, No Rambling — Just Sequence)

### Step 1 — Canonize domain home board (data + API, minimal UI)

**Goal:** Ensure `boardType="domain-home"` exists for each domain.

* Prefer a deterministic ensure pathway (create if missing).
* Do NOT delete or overwrite existing boards.
* Add migration strategy later (if `slug=domain-management` must be reconciled).

**Exit criteria:**

* For domain `default`, there is exactly one board marked `boardType="domain-home"`.

### Step 2 — Build the v0 Domain Cover + Domain Board shell

**Goal:** Replace the confusing root/www entry with a coherent v0 public entry.

* Public entry resolves domain
* Shows v0 cover
* Provides a calm nav to required frames (Cover, Moment, Kept, Agent, Domain Config, Diagnostics)

**Exit criteria:**

* A user can land on a domain and understand where they are.
* Navigation is obvious and doesn’t rely on “secret links.”

### Step 3 — Re-surface existing domain management as v0 frames (wrap, don’t rewrite)

**Goal:** Bring working `/root` domain functions into v0-styled frames **without changing backend contracts**.

* Domain Settings → v0 Form frame
* Custom domains / Vercel → v0 Form/Status frame
* Members → v0 People/Membership frame
* Keys → v0 Keys/Integrations frame

**Exit criteria:**

* Same API endpoints, same behaviors, new v0 surfaces.

### Step 4 — Promote FeedbackRail + Trail into reusable Frame Primitives

**Goal:** Make these behaviors reusable across frames.

* FeedbackRail becomes a shared primitive component.
* Trail becomes a shared primitive, but only after it has a proper home in the Domain Board shell.

**Exit criteria:**

* Moment uses shared primitives.
* At least one additional frame can consume the same primitives.

### Step 5 — Agent frame in v0 (Kip seam)

**Goal:** Provide the v0-native place for Kip.

---

## Guardrails (Hard)

* **Do not break `/root` working functionality.**
* **Do not create a second domain management system.**
* **Canon first (boardType=domain-home), then surface.**
* **Moment remains the reference implementation.**
* **Design Frame remains first-class, not deferred.**
