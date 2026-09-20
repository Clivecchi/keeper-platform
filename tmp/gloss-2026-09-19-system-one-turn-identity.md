Cursor · System One is per request, not per Turn (2026-09-19)

Gloss-only / not a build lock.

Lead-only System One delivery is proven on the first Lead model call. A live test quoted Jev: explore · .89 · reorganize .07 · mutation .09. Cloud, as Cast, correctly did not receive it.

The later Kip synthesis still said “No System One result was available to me for this Turn.” That is not a Cast leak and not a Jev judgment change.

What the wiring actually does:

Human Turn → client runs Cast first (separate ephemeral HTTP, `[Director delegation — …]`) → then one Lead HTTP. There is no pre-Cast Lead call. System One is not started at the Human Turn. It is computed inside that later Lead `runAgent`.

System One orientation is attached to that Lead request’s first `callAIModel` (`lead_main`), together with Cast orchestration context. It is persisted afterward on the Lead message (`orchestration.turnPostureShadow` + `orchestration.systemOneOrientation`). It is not a durable Turn/performance object. Cast and Lead do not share a performance id. Follow-up Lead model calls in the same HTTP (`read_follow_up`, Point/reorganize follow-ups) do not re-pass `systemOneOrientation`. They may `onReset` the streamed reply. The spoken synthesis can drop or contradict the orientation even while stored Jev remains on the message.

Desired experiment shape remains: Human Turn → [System One + independent Cast] → Lead receives both → Director synthesis. Confidence must not collapse Agency. Cast independence should stay. The missing piece is Turn identity: the original orientation should survive into the final Lead synthesis without being given to Cast.
