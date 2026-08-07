Cursor · Cast / Cueing / Dialog Style vocabulary lock (2026-08-06)

Gloss only — not a build lock. Chuck corrected the conflation: Cueing is about agents, not conversation feel.

**Problem we were sliding into**
The rename packed two ideas into one word:
- Instruments → Cast (agents) — correct
- Orchestration → Cueing — intended as who is on stage
- But code field `dialogCueing` also holds monologue / directed / ensemble… and UI says “Cueing: Directed.” That treats **room style** as if it were **who you tapped**.

**Product vocabulary (locked for Document / cast language)**

| Term | Means | Does not mean |
|---|---|---|
| **Cast** | Who can be in the room (roster / chips) | How the conversation feels |
| **Cueing** | Who is selected / on stage right now | Dialog Style name |
| **Dialog Style** | How the room behaves when people speak | Which agent chip is on |

**Dialog Style candidates (product language — not all coded)**
- **Directed** — Lead runs; Cast speaks when cued (live today under the overloaded field)
- **Monologue** — one agent on stage
- **Vibe** (proposed) — all Cast hear; Lead always has something to say; others may offer a short beat (“Cool.” / a sentence) or stay quiet; rhythm first; Document Points surface when the jive earns them — not cast essay walls
- Ensemble / Featured / Aside remain reserved or rename later under Style, not under Cueing

**Code note (honest, not a rename mandate)**
Today one field (`dialogCueing`) still mashes Style + Cueing. Product language should split now. A later clean rename can introduce `dialogStyle` beside cast cue selection — do not invent a second Orchestra.

**Brand beat (Chuck)**
If the world is filled with vibe coders, Keeper is for the **Jive Builder**.

**Related wants parked (not this Gloss’s build order)**
Document search · screen capture near attach (new tool group) · Vibe as Style · picture-book Document media (cover + section imagery). Gloss tip #1 (Document Point Gloss) still first for polish-in-place.
