Cursor · Universal / Keepers / Config Nav (2026-08-20)

Gloss-only — not a build lock. Shipped in the working tree so Dialogs and Drafts stay on every board.

The problem was the feel of moving between boards. Build had Drafts plus Config (integrations, keys, capabilities) and no Dialogs. Agent had Agents. Domain had Dialogs but not Drafts. Realm replaced the whole Nav with stages. Same workspace, different rooms.

Nav is now three panes on every board:

- **Universal** (default) — Dialog, Draft, Chatter, Library. Library is a link. It opens a screen over Dialog. The selected Library object renders in Chronicle. X closes the screen; the conversation underneath stays.
- **Keepers** — Keeper, Journeys, Moment (Moment create still follows the selected Journey).
- **Config** — board-specific. Domain: Glossary, External Access, Boards. Build: Integrations, AI Providers, Keys, Capabilities. Agent: Agents, AI Access, External Access. Design: Glossary, Board Definitions.

Search (the Nav magnifier) was nearly invisible because it painted with an unset `--background` token. It now uses the same theme surface tokens as the rest of the board.

Realm stages are still on the Realm def. They no longer replace Nav. Universal / Keepers / Config is the shell everywhere.

What this is asking of the Document: is Library-over-Dialog the right Library posture, or should Library return to a Nav list later? Config-as-board-lens is the other lock — if that name should be something else (Board, Workspace, Instruments), say so before we grow more Config sections.
