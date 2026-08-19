Cursor · Nav · Dialog · Chronicle pathway (2026-08-18)

Gloss-only / not a build lock. Review of Chuck’s Ceox thread (Jul 28–Aug 18) against live code. No code changed in this pass.

## What Chuck is hearing

Agents miss beats, skip response UI, claim to act without acting. The Ceox thread is a clean specimen: hallucinated “9 dialogs” from a 3-row screenshot; could not list or name the Dialogs in Nav; called empty-Point shells “read”; treated a leftover Glossary draft as the live Glossary; Echo · Kip painted _(failed)_ on every turn.

Chuck’s pathway (his words): Nav is useful, not noisy. Dialog is functional. Chronicle renders the most relevant detail of the object in focus.

## Do we see the same pathway?

No. Not yet. The three-panel sentence is right. The runtime is three overlapping trees.

1. **Nav click** sets `selectedDialogId` and `chroniclePanelMode: "document"`. Chronicle routes Dialog through `RealmHomeChronicle` → `DomainRealmStory` → `DocumentShell`. That matches Chuck: focused Dialog → Document, not a session dump. `enrichDialog` already emptied session lists on purpose.

2. **Dialog panel** updates the banner from `selectedDialogId`. The conversation session does **not** reliably resume that Dialog’s sessions. `useAgentDialog` stamps `dialogId` on the *next send*. Domain resume effects do not key off `selectedDialogId`. So “I loaded the Realm dialog” can mean: Chronicle switched, conversation stayed, agent still talking from the previous thread.

3. **Agent world** is a third object. Active Dialog gets `dialogDocument` (Forward / Step / Points from `document_manuscript`). If there is no manuscript, Points are empty — a titled shell. `dialog.read { id }` returns metadata only (title, title_source, document_status, forward/step titles). It does **not** return the Document Chronicle shows. Glossary is `GlossaryPresence` from bundled `docs/keeper-object-glossary.md` — there is no `glossary.read`. Ceox found draft `816c336e` with empty Points and called that the Glossary.

Chatter vs Dialog is already in schema (`title_source`: auto_generated vs user_set / system_promoted). Nav splits them. Agents still speak as if every chat is a Dialog they cannot see. Auto-title pattern remains `{Board} · {Frame} · {Date}` via `findOrCreateKipDialog`.

Echo · Kip _(failed)_ is the domain-lead collaboration catch: exceptions become `status: "failed"` and the UI paints a voice card. Empty is supposed to be valid silence. Failed is noisy.

## Locked sentence (candidate)

Nav selects the subject. When the subject is a Dialog — or belongs to one — Dialog is that conversation. Chronicle renders the subject’s most relevant body: Document for a Dialog, glossary markdown for Glossary, cover + blocks for an EntityKind. Agent context must be that same body, or the agent must say it does not have it. No third object.

## Recommended first pass (if locked)

1. Bind Nav → conversation: selecting a Dialog resumes that Dialog’s session, not just the banner and Chronicle.
2. `dialog.read { id }` returns the same Document Chronicle loads (forward, step, paths, points). Honesty: empty Points = “Document is unbuilt,” not “I read it.”
3. Echo: empty stays silent; failed does not paint _(failed)_ as a voice. Kip support speaks only when it has platform substance.
4. Glossary: tell agents it is Chronicle presence from the governing file, not a draft husk — or give them a real read.

Do not start with a Dialog-vs-Session audit UI. The audit failed because the agent and the board were not looking at the same object.
