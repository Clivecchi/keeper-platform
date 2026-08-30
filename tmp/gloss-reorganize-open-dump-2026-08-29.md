Cursor · Review & Reorganize must not dump to Open (2026-08-29)

Gloss-only / not a build lock.

Chuck asked Kip to review and reorganize Finding the Plot, show the proposed Document, and leave the accepted one untouched until Apply. That last part is correct. What landed was not.

Kip proposed moving every Point into Open. Open is the quieter Section for Points that do not yet fit — not a reorganization. Chuck called it. Kip then narrated a correction and did nothing. Follow-up turns (“so you propose moving every point into Open?”, “you did nothing”) were treated as ordinary chat, not as another Review & Reorganize turn. When an action failed, Dialog showed the error.

Three Keeper mistakes made that possible:

1. DIALOG DOCUMENT listed Points as a flat 1–N list. Section titles were a semicolon line. Kip could not see which Point already belonged where.
2. Omitting sectionId meant Open. Listing every Point to “show the proposed Document” without assigning Sections collapsed named work into one pile.
3. The prompt said omit = unplaced. That taught the dump.

What Keeper now does (this session’s working tree, not applied until Chuck says so):

- DIALOG DOCUMENT lists Points under the Section they already belong to.
- Omit sectionId keeps the current Section. Explicit “open” is only for Points that do not yet fit.
- An all-to-Open dump is repaired. Chronicle only says “Points are still in Open” when named Sections are actually empty.
- “Every point into Open” / “section called Open” is another propose turn. Raw reorganize errors stay off the Dialog.

If a useless Open proposal is still sitting on Finding the Plot: Dismiss it. After this ships, ask again. Proposed should be a Document with named Sections and placed Points — not Open.
