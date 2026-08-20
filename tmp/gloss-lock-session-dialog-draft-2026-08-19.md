Cursor · Lock: Session ≠ Dialog ≠ Draft (2026-08-19)

Locked and shipping on cloud. Gloss-only for the Document; the code is the lock.

Chuck locked: Chatter stays a session. Document is Dialog state (`title_source: user_set`) only. Chronicle becomes the selected object — a working draft opens as a draft, not an empty Document shell.

Shipped in this pass:
1. `linkDraftToSessionDialog` no longer promotes Chatter → Dialog. Working drafts link only to named Dialogs.
2. `draft.create` remaps `document_manuscript` to kind `draft` and persists `content` as proposed Points.
3. Chronicle Document shell only for `user_set`. Realm drafts use Draft presence. Chatter-linked drafts stay in Drafts Nav.
4. Rendr / Lead prompts: working draft + Points; never manuscript; prose in chat, not the JSON envelope.

Composer / Stage / Cast and “one Realm, many Stages” remain queued. Touchdown’s existing promoted row may still sit in Dialogs until Nav refresh; clicking it no longer opens an empty Document. New drafts from Rendr should appear in Drafts and open in Chronicle.
