# Becoming Together — as presented in the UI

Two distinct places show something calling itself this Document. Both are captured here, verbatim, pulled directly from what's actually stored/rendered as of 2026-07-24 — not summarized from memory.

---

## 1. The real product

`https://ke3p.com/d/ke3p?board=domain` (or `?board=realm`) → focus **Becoming Together** in Nav → Chronicle panel.

Content below is read directly from the live database (`Dialog` row `cmrtyoraw0001ot0033p5wiwm` and its `document_manuscript` draft), not paraphrased.

### Forward

**Becoming Together**

> Kip, Cloud, Ceox, Cursor, Rendr, and Chuck share one Document — the same current truth, read and written the same way on every board. Capture what actually happened. Shape it into Paths. Keep what holds. Show it here.

### Step (current tip)

**The Document is real — Forward, Step, and Points live on the Dialog**

> Placeholder Forward/Step are gone. Cast members can be consulted for real minimal input, or Kip says plainly it got nothing back. Invite adds a second human. Cursor's shipped work appears as Points credited to Cursor.

### Points, by Path

**Progress** — *What actually shipped and stuck.*
- **Becoming Together Dialog exists** (Cloud) — ke3p has exactly one active Dialog — Becoming Together. Other auto-titled board Dialogs were archived; orphan drafts moved to Library Archive pointers. `document_status` remains `drafts` until something is promoted.
- **Chronicle shows the Document on every board** (Cloud) — Focused Dialog routes to `DomainRealmStory`/`DocumentShell` on Domain, Realm, IDE, and Designer — not Realm-only. Selecting Becoming Together in Nav shows the same Document shell everywhere.

**Known Issues** — *Honest gaps — named, not papered over.*
- **Ceox can sit in the cast — consultation is real, not filled in** (Kip, *proposed*) — Ceox is enableable as a cast member. When consulted, Kip returns Ceox's real reply or reports empty honestly. An empty seat is information; dressing it up with invented quotes is not allowed.
- **Self-organizing Step is still hand-maintained** (Chuck, *pending*) — Step is honest current-tip text stored on the Dialog — not a placeholder claiming it isn't. Layer 3 (auto-choosing the next Step from lineage) is not built; Back/Forward stay disabled until it is.
- **Chronicle's Document view doesn't yet honor Keeper's own aesthetic — evidence for Rendr's live-render role** (Claude, *proposed*) — The deployed Document display in Chronicle is structurally behind the Strip reference mockup: no elevated Forward, no cast-attributed Points, no panel rhythm, no honest "open, not dressed up" section. What should transfer from the mockup is that structure — not its literal skin, which should instead run through Keeper's own Treatment cascade (Cormorant Garamond, brass/ke3p palette, Presence Field for cast avatars). This is direct evidence toward Rendr Option B or C (Chronicle as Rendr's live-render surface) but does not resolve that decision, which stays open per the Chronicle-Becoming session handoff.

**Development** — *Build work that moved the platform.*
- **Eager Dialog/session creation stopped** (Cursor) — Board mount and prefetch are resume-only. Dialog + session create waits for the first real send. Two rounds of un-gated creation produced 36+ orphan echo sessions; archive path uses `kip_sessions.is_archived`.
- **Agent recent sessions scoped by domain** (Cursor) — `GET /api/agents/:id?domainId=` filters via `dialog.domain_id`, excludes archived and dialog-less orphans. `presenceEnrichment` passes the `domainId` it already has — stops the cross-domain session leak in Chronicle.
- **Document content attached to the Dialog** (Cursor) — Forward, Step, and path declarations live on `Dialog` columns. Points live in a `document_manuscript` draft under this Dialog. No Journey, no new top-level entity. Placeholder strings in `DomainRealmStory` are gone.

**Cast & Orchestration** — *Who is in the room, and how they speak.*
- **Cross-domain cast membership is real** (Cloud) — Ceox can be added to ke3p's cast via the Cast Header Add flow. `DialogCastMember` persists; Admin on the home domain is re-checked server-side. Guest cast members are labeled Cast, not Lead.
- **Lead-initiated cast consultation** (Cursor) — `delegate.consult` runs a real minimal sub-turn against an enabled cast member. Kip synthesizes only from returned text — or says plainly it got nothing back. Inventing another agent's quote is forbidden.
- **Invite a second human** (Cursor) — Cast Header Invite opens a real form against `POST /connections/invite`. Existing users get `DomainPermission` immediately; email invites return a copyable accept link. Accept route redeems the token.

---

## 2. The artifact mockup

`https://claude.ai/code/artifact/61b11013-9543-4685-8340-c847c4830348` — a reference/comparison sandbox, not the product. Defaults to **Strip** mode; **Cast Reel** and **Original** are also selectable from the same dropdown. Content below is Strip mode, the default.

### Forward + Step (panel one of the strip)

**FORWARD**

> One doc, one truth — six voices working from it.

**NOW**

> The cast is naming itself. The roster under it isn't, yet.
- Ceox is its own agent — the roster should follow the person, not the domain.
- cross-domain-cast-membership: with Cursor now.
- Real delegation waits, on purpose — token cost first.

### The reel (cast-attributed frames, chronological)

| Cast | Beat |
|---|---|
| Cloud | Library. Real, and finally readable. |
| Cloud | Point → Document. The naming finally flips. |
| Chuck | "We are supposed to be building together. Here." |
| Cursor *(build · shipped)* | `realm-becoming-together-parity` |
| Cloud | Cloud and Rendr quietly vanished from the bar. |
| Chuck | "This really sucks." |
| Cloud | Noise archived. Becoming Together made visible. |
| Chuck | "Ceox is its own agent. The cast should follow the user, not the domain." |
| Cursor *(build · now filming)* | `cross-domain-cast-membership` |
| Rendr | "A room you enter, not a page you turn." |
| Ceox | The one seat still empty. |

### Open threads (mockup only)

- Ceox stays silent on its own domain — not yet checked why.
- Real delegation waits on purpose, to bound token cost before scaling participation.
- `draft-renders-as-document` is still queued behind cast-membership.

*(Note: the mockup's open threads and roster framing predate the real product work above — several of them are now resolved in the real Document, not the mockup. The mockup was never updated to match; treat section 1 as current truth, section 2 as a frozen design reference.)*
