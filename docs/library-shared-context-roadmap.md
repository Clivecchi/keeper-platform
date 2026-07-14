# Library — Shared Context Roadmap

**Status:** planning — none of the steps below are complete. This document exists so the plan doesn't live only in chat.

---

## Why

No agent working on Keeper — Kip, Cloud, Cursor, Claude-in-chat — currently has reliable access to the same ground truth. What was assumed to be one thing ("Library") turned out to be five uncoordinated stores, each doing a slice of the job:

- **LibraryItem EntityKind** — domain-scoped uploads/links, real DB + API + Chronicle UI, but write-only (embeddings generated, never queried)
- **`/library` (LibraryPage)** — a disconnected legacy mockup, still linked from the sidebar
- **`kip_drafts`** — real, permissioned, versioned, but never scaled past one topic at a time
- **SOLE memory** — real save/read wiring, but "semantic" search is a substring match over mocked embeddings
- **`docs/` + `AGENTS.md` + `docs/modules`** — the only thing actually keeping Cursor in sync today, and it's entirely manual

Library isn't Drafts and shouldn't try to be. Drafts turns dialog into documentation — authored, one topic at a time. Library holds material nobody authored through dialog — uploads, links, things pointed at rather than written. The working hypothesis: Library's real role isn't a sixth store, it's the connective index across the other four. Not yet decided — see step 7.

---

## Steps, in dependency order

1. **Close the live permission gap.** Library routes have no domain-permission check — any authenticated user who knows a `domainId` can read or write another domain's items. Fix before anything else builds on top of it.

2. **Retire `/library`.** Dead mockup, still linked from the sidebar as "Documents." Delete or redirect it — it actively misleads anyone who finds it before the real thing.

3. **Give LibraryItem a read path.** Embeddings are generated on create and never queried. Nothing downstream — MCP, Kip, Gloss — can work until there's a real `search`/`list` endpoint. Doesn't require pgvector to start; cosine similarity over the existing `Float[]` column unblocks this without waiting on infra.

4. **Let Kip read Library, not just write to it.** `image.generate` can archive *into* Library today. There's no `library.read` action — Kip can't look anything up. This is the in-platform half of "same Library."

5. **Add Library tools to the MCP registry.** Mechanically small — the transport/auth pattern is already proven across the Railway/Vercel/GitHub tool families in `apps/api/src/mcp/tools.ts`. `library_list` / `library_get` / `library_search`, read-only first. This is the outside-tool half of "same Library" — the part that gets Cursor and Claude-in-chat real access.

6. **Decide the MCP auth model before step 5 ships externally.** The current MCP key is one shared secret for every caller. Fine in-platform; not fine to hand external tools as-is. Needs scoping before it's real access rather than a security hole.

7. **Resolve what Library actually owns.** Does it become a connective index across Drafts/SOLE/docs, or stay scoped to uploads/URLs? This decides whether AGENTS.md and the repo docs ever become Library-backed content an outside tool could query, or whether that stays a separate, manual, git-only path indefinitely.

8. **If step 7 says "index across stores" — build pointers properly, read-only.** A pointer into GitHub is not a write surface into GitHub. Letting a Dialog Draft write back into GitHub through the Library UI is a permissions decision, not a UI decision, and shouldn't be made by default. This document itself is the first real pointer instance — see the Library mockup.

9. **Close the documentation drift.** Update `AGENTS.md` to mention Library once it's stable enough to describe accurately. Don't do this before the steps above are real — that's exactly the drift this whole investigation started from.

---

## Related

- Session diagnostic: two unrelated systems both called "Library," five uncoordinated context stores, MCP exists but unused for this.
- Prototype: Dialog + Chronicle Gloss mockup ("Library — Now Showing" artifact) — demonstrates the interaction model, not production code. Cursor migrates the pattern into real Chronicle when it's time; the mockup doesn't need to be pixel-perfect first.
