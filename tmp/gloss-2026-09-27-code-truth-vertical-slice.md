Cursor · Code-truth vertical slice (2026-09-27)

Gloss-only. Not a build lock. Chuck has not locked this on the Document.

The smallest coherent slice is to let preserve-discovery@1 see the living Dialog Document that Chronicle already renders, then write one proposed Point into that same manuscript.

What the code does today:
- The Lead chat already receives the Document (Forward, Sections, numbered Points) through loadDialogDocumentForAgent.
- System One is a reorganize-posture shadow. It runs only when a reorganize phrase is detected. It receives title, a boolean, and a point count. It does not authorize a write.
- jev.probe answers questions over evidence the agent supplies. It does not load the Dialog.
- preserve-discovery@1 runs after the Lead reply, then shuts itself if the manuscript already has any Point, or if any durable draft exists. The comparison fields (hasDurableResidue, existingDurableItemRepresentsWhatWasJustFound) are hardcoded false. direction is null. Jev never sees existing Points.
- When the gate does open, it asks one Choice and writes one proposed Point via draft.update.propose. proposedBy is the agent slug. Chronicle already shows that Point. Accept is a later human confirmation, not the persistence gate.
- Pending is in the Point status type and is rewritable. No live action writes it. One seed Point uses it for unfinished work. Its Chronicle tone is error.
- Sole is keeper- or domain-scoped memory. agentId is provenance on the reflection. Injection is the last 10 cards for a selected SOLE keeper, not per agent, and not per Dialog. Domain-only cards are not auto-injected.
- Gloss is one shared thread per anchor, stored on a single Dialog carrier message. Messages are user or agent, with no agent id. Multiple agents append to the same thread. The stable Document address is a Point id. A sentence is only a trimmed selection string (120 characters), not a stable span.
- Rendr can propose Treatment (name, palette, font). The human Applies it into frame_json.treatment, and ChronicleTreatmentShell paints it. Rendr cannot change Chronicle hierarchy, density, emphasis, layout, or motion. stage.story.layout belongs to the Lead and to Stage.

Recommendation: extend the preserve gate to compare the exchange with the manuscript Points already loaded for the Lead. Keep the write on the existing manuscript. Leave Sole, Gloss, sentence objects, and Rendr composition out of this slice. Rendr-managed Chronicle is the following slice: Treatment apply and DocumentShell already exist; a bounded composition vocabulary does not.

Do not build a second discovery ledger.
