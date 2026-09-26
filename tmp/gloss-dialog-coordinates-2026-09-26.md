Cursor · Dialog should show Talking in / Working on (2026-09-26)

Gloss only. Not a build lock. Do not build yet.

Chuck sees Talking in and Working on on Stage. He does not see them in Dialog. The agents still receive those coordinates in the prompt, which is why they named "Build · conversation · Aug 26" while the Build header showed Kip · Cloud.

The header already renders those coordinates. Stage always passes them. Off Stage, Dialog shows them only when Talking in is a named Dialog, or Working on is something other than the session. A Chatter session fails that gate, so the machine title stays in the prompt and off the header.

Candidate, not a lock: Dialog should show the same Talking in / Working on line Stage already shows, including Chatter. That is the place to build out next. No code change in this note.
