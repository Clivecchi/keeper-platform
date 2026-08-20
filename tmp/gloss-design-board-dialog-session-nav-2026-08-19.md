Cursor · Design Board Dialog + Session nav (2026-08-19)

Gloss-only / not a build lock. The wire is in code on this branch; deploy is Chuck’s call.

Chuck’s ask: Design Board was rendering under Domain Chronicle with no way to select the active Dialog or Session. Agents on Design were flying blind — reading board-def Chatter instead of the conversation the user was in — so they could not build alongside in a shared draft.

What was wrong:
- DESIGNER_BOARD_DEF hid Dialogs and Drafts. Nav was Glossary + Board Definitions only.
- Designer conversation always resumed `resumeBoardSession({ board: designer, frame: focusKey })` — a board-def Chatter thread.
- `useSelectionSessionResume` skipped designer entirely, so Nav Dialog select never bound the center composer.

What shipped in this pass (Nav wire, not a Document change):
1. Design Nav now lists Dialogs, Sessions (for the selected Dialog), Chatter, and Drafts — then Glossary and Board Definitions.
2. Session picker is a Nav item. Select a Dialog first; then pick the thread. Echo side-sessions stay out.
3. When a Dialog or Draft is selected on Design, that object owns the conversation. Board-def Chatter only resumes when nothing is selected.
4. Named Dialog resume on Design prefers the session with messages (not Rendr-only), so prior Realm/Agent work can open here.
5. Realm Stages stay on Realm. They replace the whole Nav; they are not slotted onto Design.

Board-emphasis invariant: switching to Design does not create a different Dialog. Same Dialog, same Session, Design lens.

Touchdown draft still looking mostly empty is the older `draft.create` path (manuscript `content` ignored, no Points). This Nav wire lets Design join the same conversation; it does not backfill missing Points.
