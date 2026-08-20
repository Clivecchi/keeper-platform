Cursor · Touchdown: Session ≠ Dialog ≠ Draft (2026-08-19)

Gloss-only / not a build lock. Diagnosis of the Touchdown thread (Aug 18–19) against live code. No code changed in this pass.

## What Chuck is seeing

Rendr cannot create a draft he can open. Touchdown is now a Dialog. Chronicle shows Document / History with no Points — “Realm is breathing” plus “add writing from outside Keeper.” Kip reports the Dialog is active with no Points loaded, then hunts drafts. The agent is lost because the three-panel pathway is looking at three different objects.

Chuck’s lock, restated: not every session is a Dialog. Dialog opening a Document would itself be a problem if the working draft “Touchdown” were what Chronicle showed. Chronicle is not becoming anything.

## What the runtime actually did

Three objects were collapsed into one row.

1. **Session** (`kip_sessions`) is a conversation thread. Not an EntityKind. Chronicle has no Session presence.
2. **Dialog** is a named conversation that owns a Document. `onDialogSelect` always sets `chroniclePanelMode: "document"`. Every board then routes focused Dialog through `RealmHomeChronicle` → `DomainRealmStory` → `DocumentShell`. That path is correct for Becoming Together. It is wrong for a working conversation that was never meant to carry a Document.
3. **Draft** (`kip_drafts`) is the working artifact. Ordinary drafts have Points. `document_manuscript` is Dialog Document storage, hidden from Drafts Nav on purpose.

Touchdown’s path:

- First send on Realm find-or-created a Chatter Dialog (`title_source: auto_generated`) and attached the session. In code, every board conversation already sits on a Dialog row. That is the first collapse.
- Rendr emitted `draft.create` with `kind: "document_manuscript"` and a markdown `content` field. The executor ignores `content`; it only persists `spec.points`. So the row, if created, had no Points.
- `document_manuscript` is not a working draft. Nav filters it out of Drafts. Chronicle only expands it as Dialog Document Points — which were empty.
- Linking that draft to the session **promoted Chatter → Dialog** (`linkDraftToSessionDialog`: `auto_generated` → `system_promoted`). The conversation jumped into the Dialogs bucket. Title became “Touchdown - Aug 19.” Clicking it opened an empty Document.
- Later Rendr dumped the raw `agent_output` JSON into chat. That is a second failure (envelope leaked instead of executing), which made persistence look like “the agent is broken” rather than “the work landed in the wrong box.”

Kip’s status line was honest: Dialog active, Document unbuilt. It was the wrong object to be honest about.

## Why Chronicle is not becoming

Locked comment in `UniversalViewPanel`: focused Dialog → Document, universal, not Realm-only. On Realm, draft / moment / library also route through `DomainRealmStory`, which then **refuses to render ordinary drafts as Point cards**. Selecting a working draft on Realm still will not show the draft.

So Chronicle does not become the selected object. It becomes a Document shell. When the Document has no Points, the surface is a breathing placeholder. That is the break.

Rendr’s own prompt still says: tune Treatment; do not use `draft.create` for Treatment. It was never taught “create a working draft, add Points, give the human a thing they can open.” When asked to document Composer / Stage / Cast, it reached for the wrong kind and the wrong payload.

## What must not be mixed

| Object | What it is | Chronicle should become |
|---|---|---|
| Session / Chatter | A conversation. Auto-titled. `title_source: auto_generated`. | The conversation. Not an empty Document. |
| Dialog | A named conversation that owns a Document. `user_set` or an explicit “this is a Document.” | Document (Forward / Step / Points). |
| Draft | A working artifact with Points. Not `document_manuscript`. | Draft presence (cover + points), or Realm accumulation of that draft — not a Dialog Document husk. |

Promotion Chatter → Dialog must not happen because an agent attached a draft. Naming the Dialog, or the human adding work to a Document, is the elevation.

## Decision (needs Chuck)

When Nav selects a conversation that is still Chatter, does Chronicle stay off the Document shell?

Recommendation: **yes**. Document is Dialog state, not session state. Touchdown should have stayed a session with a working draft named Touchdown. Chronicle should have become that draft.

## Recommended first pass (if locked)

Do not start Composer / Stage / Theatre.js. Do not start “Realm has many Stages.” Restore becoming first.

1. Stop `linkDraftToSessionDialog` from promoting Chatter → Dialog.
2. `draft.create` rejects `kind: document_manuscript`. Map `content` / first-point title into `spec.points`. Open the draft (`onDraftSelect`) on Realm the same as Domain.
3. Chronicle: `showRealmDocument` only for a named Dialog or a Dialog that already has manuscript Points — not every `selectedDialogId`.
4. Teach Rendr/Cloud: working draft = `draft.create` (kind draft) + `draft.update.propose` for Points. Manuscript is Document infrastructure, not an agent kind.

Composer / Stage / Cast, the five primitives, Theatre.js, and “one Realm, many Stages” stay queued behind this. The brief Chuck attached is still the right brief — it just has nowhere to live until Draft and Dialog are distinct again.
