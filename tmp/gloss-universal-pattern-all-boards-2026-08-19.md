Cursor · Design back on the Universal Pattern (2026-08-19)

Chuck locked: we never should have left the Universal Pattern. Fix Design to the constitution, and check the other boards.

Constitution: Nav selects one subject. That subject is the conversation. Chronicle is that body. Boards are lenses.

What was wrong:
- Design ran a second OS: `?definition=` auto-defaulted to Domain Board and could outrank Dialog in Chronicle.
- Design conversation stayed keyed to `boardDef` even when Touchdown was selected.
- Domain and Agent skipped session resume for Journey/Keeper/Draft, so Chronicle moved and Dialog stayed behind.
- Draft URL wrote `board=domain`, leaking across boards.

What this pass does (all boards):
1. Board Definitions is a mutually exclusive Nav item, same list as Dialog. Chronicle reads `selectedBoardDefId` only — no Design URL routing, no auto-select on entry.
2. Conversation identity follows the Nav subject. Dialog selected → that Dialog. Board Def selected → that spec. Idle Design → domain lens, Rendr still leads.
3. Nav subject drives Dialog on Domain and Agent too.
4. `?draftId=` no longer forces Domain Board.

Lens that stays: Rendr on Design, Glossary config layout on Design, Realm staged Nav presentation, Build integrations.

Not in this pass: merging Chatter into Dialogs, Agent training as a Nav row, replacing RealmStagedNav.
