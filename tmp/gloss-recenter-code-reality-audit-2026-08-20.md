Cursor · Re-Center Code Reality Audit (2026-08-20)

Gloss-only. Not a build lock. Code inspection of the live repository — no redesign, no new surfaces.

The working hypothesis holds, with one correction: Universal Board is a real shared shell. The weak seams are not “UI vs architecture” so much as **model-discretionary agency**, **optional object writes**, and **split relationship contracts**.

1. Universal Board is one React shell (`UniversalBoard` + `UniversalBoardDef`), selected by `?board=`. Realm / Domain / Build / Design / Agent are different defs, not different apps. `BOARD_REGISTRY` is unused at runtime. Prisma `Board` and `?frame=` are leftover stacks.

2. Default landing is `?board=realm` (`resolveDefaultWorkspaceBoardId`). AGENTS.md still says domain. Docs lag the code.

3. Agent turns are a structured JSON action executor around a chat model. Capability use is almost entirely model tool-choice. `delegate.consult` is allowed when a roster exists; nothing forces Cloud for technical questions. `draft.create` is on `GOLDEN_PATH_ACTIONS` — domain policy cannot remove it; `canDraft` is prompt-only.

4. Keeper Points are not a Prisma table. They are `DraftPoint` objects in `kip_drafts.spec_json.points`. Dialog messages are never mined. No post-turn extraction. A long Dialog with zero `draft.update.propose` / ingest / REST writes ends with zero Points by design. Chronicle “No Points yet.” reflects the loaded manuscript, not conversation substance.

5. Dialog / Draft / Document are three overlapping links: `kip_drafts.dialog_id` (Nav), `Dialog.document_components` (Add to Document), `document_manuscript` (Document Points). There is no UI labeled “Link to Dialog.” Auto-link skips Chatter (`title_source !== user_set`). PATCH draft cannot set `dialogId`. `DraftSessionsBlock` is unmounted.

6. Board nav logs (`requested=build`, `windowSearch=?board=build`, `routerSearch=?board=domain`) are expected React Router lag. `V0Shell` owns writes; window + pending win reads.

7. Shared ontology exists as `docs/keeper-object-glossary.md` + `glossary.read`. It is not injected every turn. Rendr’s voice is Treatment / spatial density; “Point” in that prompt is draft content, not the Keeper object. Rendr can hear “still no Points” without being grounded.

8. Highest-leverage seams: (a) when a capability must fire vs model discretion, (b) Dialog → manuscript Point write path, (c) one intended Draft–Dialog–Document relationship, (d) glossary injection for Cast. Do not reopen the three-panel board or the Prisma Domain → Keeper → Journey → Path → Moment hierarchy.
