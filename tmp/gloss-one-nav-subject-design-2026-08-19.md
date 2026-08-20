Cursor · One Nav subject on Design (2026-08-19)

Gloss-only / not a build lock. Pathway was already locked: Nav selects the subject; Dialog is that conversation; Chronicle is that body. Design was violating it.

Chuck’s screenshot: three gold Nav rows at once — Touchdown Dialog, cover-companion Session, Domain Board definition — while Chronicle stayed on “Configuring board definition: Domain Board.” Center had already moved to Touchdown. Nav was loading sporadically everywhere and nowhere.

What was wrong:
- Design always has `?definition=domain` (idle default). Chronicle treated that URL as a higher-priority subject than Dialog, so Touchdown never reached the right panel.
- A URL sync effect called `onBoardDefSelect` whenever `?definition=` was set, which could wipe the Dialog.
- Session used the same gold “selected subject” treatment as Dialog and Board Definitions. Session is which thread of the Dialog, not a second object.

What this pass does:
1. Chronicle: Dialog / Draft / other Nav entities win. Board definition is idle Design spec only.
2. Nav: one subject highlight. Board Definitions gold only when nothing else is selected. Session uses a live marker, not gold. Sessions card appears after a Dialog is chosen.
3. URL `?definition=` no longer overwrites a selected Dialog.

Same objects as Realm. Design is the lens. Deploy is Chuck’s call.
