# Keeper — Brand & Products

**Audience:** Chuck · Kip · Cloud · Rendr · Cursor  
**Status:** Synthesis document — brand language grounded in shipped doctrine and live platform shape  
**Date:** 2026-08-05  
**Trust:** Narrative + product framing; when it conflicts with Prisma or live code, **the codebase wins**

---

## 1. The sentence that holds

Keeper is not an app that stores things. Keeper is a place you arrive when something matters.

It exists to help people notice, capture, and keep what is worthy of effort — across life, work, memory, and meaning. Not everything. Just the things that deserve to last.

**Canonical build phrase:** *Kip builds Keeper. On Keeper. Through Keeper.*

That phrase is brand and method at once: the platform is built inside its own world, by agents and people who live there, not as an external SaaS bolted onto a blank CMS.

---

## 2. Brand essence

### What Keeper is

| Pillar | Meaning |
|---|---|
| **Story-first** | Stories, work, and memory are first-class — not files, not posts, not feed items |
| **Stewardship** | A Keeper is an enduring container of purpose and continuity, not a folder |
| **Calm place** | Continuity over velocity; clarity over cleverness |
| **Domain-scoped** | Clear ownership and boundaries; each realm can carry its own identity |
| **Frame-based** | Experienced as places (frames), not as a page-based website |
| **Bridge** | Personal narrative, community, and practical work in one system |

### What Keeper is not

- A social network chasing attention  
- A productivity dashboard  
- A content feed  
- A generic note-taking app  
- Administration dressed up as creation  

When the interface feels like forms and databases instead of building something meaningful, the brand has already failed — even if the feature “works.”

### Emotional contract

Keeper waits. It does not rush. When something happens that you don’t want to lose — a thought, a decision, a memory, a season — you bring it here. When you return later, it is still there.

That is the brand promise: **permanence with dignity.**

---

## 3. Design doctrine (brand made visible)

From the Keeper Design Manifesto — **The Clean Surface Doctrine**:

> *If the surface isn't calm, the depth can't be seen.*

### The Seven Laws (product design north star)

1. **Clarity is Sacred** — Power never justifies confusion.  
2. **Every Surface Should Feel Worth Keeping** — No throwaway screens.  
3. **Build Only What Serves Creation** — Create, connect, or preserve — or it doesn’t belong.  
4. **Emotionally Clean Equals Functionally Clear** — Heaviness is a design failure.  
5. **Kip Should Feel Present, Not Panels** — Conversational presence over control-panel UX.  
6. **Preserve Creative Dignity** — Never feel like filling out forms.  
7. **If You Wouldn't Keep It, Don't Ship It** — The five-year pride test.

These laws are not marketing copy. They govern Nav vs Chronicle, Present vs Workshop, and why member work refuses to sprawl across legacy `?frame=*` routes.

---

## 4. Product language vs engineering language

Two flows exist on purpose. They are not competitors.

| Layer | Flow | Role |
|---|---|---|
| **Product** | **Capture → Shape → Keep → Show** | How humans experience becoming: raw material → form → stewardship → public story |
| **Engineering UX** | Capture → Connect → Create → Build | How the platform is assembled internally |

Realm Nav stages already echo the product flow: **Drafts → Kept → Presented** (in progress → settled → public-ready). That alignment is intentional brand architecture, not coincidence.

---

## 5. The product objects people actually live in

Sacred data hierarchy (do not flatten or rename):

```
Domain → Keeper → Journey → Path → Moment
```

| Object | Brand meaning | Product role |
|---|---|---|
| **Domain** | A realm with ownership, treatment, and boundary | The world you enter (`ke3p`, personal domains, brand hosts) |
| **Keeper** | Structural heart — stewardship container | Holds purpose, memory, continuity; contains Journeys |
| **Journey** | A living arc of meaning | Not chapters; unfolds through Paths |
| **Path** | Progression within a Journey | Organizes how Moments accumulate |
| **Moment** | Acknowledgment that something mattered | Not a post — a kept unit of meaning |

**Library** is not a hierarchy layer. It is a **connective index** — uploads, links, and read-only pointers across stores — surfaced on the Universal Board Chronicle, not as a legacy `/library` app.

**Document** (Dialog workspace: Sections + Points) must never be confused with Journey **Path**. Same English word family; different products. Collapsing them breaks both brand and build.

---

## 6. Products as surfaces (what ships to people)

Keeper is one platform with two primary audiences and one singular member workspace.

### Member product — Universal Board

**Where:** `/d/:slug?board=domain` (also `ide` / `agent` / `designer`)  
**Shape:** **Nav · Dialog · Chronicle**

| Panel | Job |
|---|---|
| **Nav** | List, select, `+` trigger only — never own the form |
| **Dialog** | Conversation with Kip and cast — presence, not tickets |
| **Chronicle** | Focus · Config · Act — where intentional work lands |

This three-panel board *is* the member product. Phase 1 rule: wire here first; do not extend standalone legacy frames for new member work.

### Public / guest product — Present (and Cover today)

**Target:** story-first, read-only narrative surface (`PresentFrame` / Presentation world).  
**Today:** Cover + companion path carries much of the guest experience; Present is the declared singular public UI after board engagement hardens.

Engagement deepens story; it never replaces it. That constraint is brand law encoded as pipeline discipline (Engagement Templates → single executor).

### Brand realm product — custom hosts

Personal and branded realms resolve from hostname, not path:

- Platform: `ke3p.com` / `/d/:slug`  
- Tenant: `{slug}.keeper.domains`  
- Custom brand: e.g. `livecchi.us` at `/` via brand shell mode  

Each domain carries **treatment** (wordmark, tagline, visual identity). Unseeded personal domains must not bleed platform KE3P/Kip branding into the top bar — identity is product, not chrome.

Platform tagline still in circulation: *cryptically designed, wonderfully underfolded / unfolded* — KE3P voice, not every domain’s voice.

---

## 7. Kip — product, not feature

Kip is dual by design:

1. **A modular agent framework** — actions, sessions, MCP, Engagement Templates, SOLE memory  
2. **A named Lead agent** — fixed voice and persona; companion, not chatbot widget  

Brand implication of Clean Surface Law 5: people should feel *someone is with them*, not that they opened an admin console.

**What Kip productizes today (wired):** chat pipeline, SOLE read/write into prompt, domain contract via `frame_json`, session rituals, MCP, engagement execution.

**What Kip still owes the brand:** Voice Panel / Echo / Logbook presence, reliable “when to draft vs SOLE,” full engagement on Moments/Present, navigating frames on the user’s behalf, hardened public companion.

**Method brand:** agents (Cloud, Rendr, Cursor, Kip, …) build the platform *as cast* inside Dialogs such as ke3p · **Becoming Together**. Gloss is Cursor’s voice on that Document — message-anchored, not a silent PR description.

---

## 8. Named products & horizon

| Name | What it is | Status in platform plan |
|---|---|---|
| **KE3P / ke3p.com** | Platform home / hub domain — where Keeper builds itself | Live production surface |
| **Keeper (platform)** | Multi-domain life-and-profession system | Phase 1 in progress (jsonframe Steps 1–6 complete) |
| **Pool Keeper** | Proof-of-concept Keeper on a working platform | **Phase 2** — do not build while Phase 1 incomplete |
| **Generation Keeper** | First production instance — **livecchi.us** | **Phase 3** |
| **Realm** | Domain’s front door — Nav built by accumulation, not empty categories | Direction locked; treatment-compliant build in motion |
| **KeeperType** | Typed patterns for Keepers / marketplace direction | Forward-design / schema presence; marketplace later |
| **Present** | Public storytelling singular UI | After board engagement completeness |

**What not to brand as “now”:** Icon View Switcher as one control, 3D co-build, live vendor pricing APIs, mobile-native app product, marketplace publishing, full Dev Board collaborative IDE — real, documented, later.

---

## 9. Commercial product model (early, real)

Tiers attach to **what resolves at runtime**, not to a key list in the UI:

| Tier | Access posture |
|---|---|
| **Free** | Included AI capacity only |
| **Keeper** | Included + bring-your-own-key (BYOK) |
| **Studio** | Higher capability posture (tier flags exist; packaging still maturing) |

Owner-facing language: **Included** vs **Yours** — never expose platform infrastructure as the story. Principle locked: *technically shared, experientially private.*

---

## 10. Brand vocabulary that must stay sharp

| Say | Don’t collapse into |
|---|---|
| Keeper (object) | Folder / project / workspace synonym soup |
| Moment | Post / tweet / note |
| Journey Path | Document Section |
| Present | Another board with edit chrome |
| Chronicle | A fourth “frame route” |
| Realm | Synonym for Domain in UI copy (Realm is board/surface language; Domains are what people pick) |
| Library | Replacement for Drafts or SOLE |
| Capture → Shape → Keep → Show | Engineering’s Capture → Connect → Create → Build |

---

## 11. Competitive contrast (positioning, not marketing brief)

Keeper wins when the alternative feels like:

| Alternative feeling | Keeper answer |
|---|---|
| Infinite feed / noise | Kept Moments inside Journeys |
| Notion-as-database | Story-first stewardship with calm surfaces |
| ChatGPT side panel | Kip present in Dialog + Chronicle Acts |
| Multi-tool sprawl | One Domain realm: capture, shape, keep, show |
| Admin consoles for AI keys | Included / Yours whisper on Agent Board |

The differentiator is not “AI + notes.” It is **worth-keeping as product principle**, enforced by hierarchy, frames, engagement discipline, and design law.

---

## 12. What is locked vs still becoming

### Locked (treat as brand/product truth)

- Worth-keeping mission and Clean Surface Doctrine  
- Domain → Keeper → Journey → Path → Moment  
- Product flow Capture → Shape → Keep → Show  
- Singular UI: Universal Board for members; Present for public story  
- Nav triggers / Chronicle renders; declared Focus · Config · Act  
- Kip dual identity (framework + named Lead)  
- Phase order: finish Phase 1 before Pool / Generation Keeper builds  
- Brand hosts and treatment as domain identity  

### Becoming (accurate, not yet finished)

- Realm as every domain’s primary surface (treatment-first)  
- Present as hardened public singular UI  
- SOLE Voice / Echo / Logbook as lived Kip product  
- Tier packaging and Studio product clarity  
- Generation Keeper on livecchi.us as Phase 3 proof of life outside ke3p  

---

## 13. One-page brand brief (for outsiders)

**Name:** Keeper  
**Promise:** A calm place to keep what is worthy of effort.  
**For:** People and professions who need continuity of story, work, and memory — not another feed.  
**How it feels:** Arrival, presence, stewardship, return.  
**How it works:** Domains hold Keepers; Keepers hold Journeys; Journeys unfold through Paths into Moments; Kip helps Capture → Shape → Keep → Show.  
**Where it lives:** ke3p.com (platform), personal/tenant realms, branded hosts.  
**How it’s built:** On itself — Kip builds Keeper, on Keeper, through Keeper.

---

## Sources (canonical)

| Document | Role |
|---|---|
| `docs/keeper-heart-mind.md` | Heart journeys + mind architecture |
| `docs/keeper-ui-experience.md` | Surfaces, engagement, singular UI |
| `docs/keeper-object-glossary.md` | Vocabulary discipline |
| `docs/realm-domain-surface.md` | Realm as domain front door |
| Clean Surface Doctrine (`CleanSurfaceDoctrinePage`) | Design manifesto |
| `AGENTS.md` | Phases, Kip, product vs engineering flow |
| `docs/week-in-review-june-2026.md` | Tier / Included·Yours commercial posture |

---

*This is a synthesis for orientation and cast alignment — not a lock that overrides Chuck’s Document decisions on Becoming Together.*
