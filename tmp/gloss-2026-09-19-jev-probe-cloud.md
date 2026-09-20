Cursor · Jev Probe as Cloud capability (2026-09-19)

Gloss-only. Not a build lock.

The working Code X-ray harness had a reusable evaluation core hiding inside a developer CLI: one TypeSafe call over evidence, typed questions, answers with confidence. That core is now in Keeper as `runJevProbe`. The CLI is a consumer. It still writes a Code Map to `tmp/jev-xray/`. It does not persist Probes.

Cloud can invoke it as the Kip action `jev.probe` over supplied evidence (`evidence` + `questions`, optional `context`). Capability string `jev.probe` is declared on Cloud so grant and knowledge share a name. Operational prompt teaches: emit `jev.probe`, never `mcp.call` name `jev.probe`. Existing action receipts render the result. No new UI.

Out of scope, on purpose: ACME, Evaluation objects, Probe management, scheduling, persistence, generalized workflow. `typesafe.evaluate` remains the lower-level TypeSafe tool. Jev Probe is the evidence-facing call.

Next if this earns a Document Point: whether Lead should prefer `jev.probe` when evidence is already in hand, and whether a later code-intelligence pass should feed Cloud evidence from GitHub reads into this same action.
