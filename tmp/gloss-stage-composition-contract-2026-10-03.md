Cursor · Stage Composition contract (2026-10-03)

Gloss only. Not a build lock. Where are we? stays as it is.

Stage today branches. An arriving admin gets a fixed reading layout. Everyone else gets the story filmstrip. Those are two screens. Composition is the missing object between a Reading and the Stage.

Authority, as Chuck named it: the resolver owns what stored evidence supports. The Reading owns what is being presented. Rendr owns Composition — hierarchy, sequence, emphasis, which existing continuations and media are featured. Treatment is the look Composition may point at. Stage presents the Composition. Rendr does not add a claim the Reading did not already contain.

Reuse, do not parallel: `KeeperStageComposition` stays the stored room (assets, the one story, stage theme). `stage.story.layout` stays how a story’s slides are written. `FramePerformance` stays the turn-scoped Frame. Theatre.js stays motion (`cover`, `slide`, `media`, `journey`, `moment`, `frame`). The Three.js host stays unwired. Domain cover and Library stay the media.

Smallest contract: a Reading is items with ids. A Composition is nodes that cite those ids, each with sequence and emphasis (`primary`, `support`, `trail`), plus a treatment pointer (`domain` or `stage`). A node whose id is not in the Reading is dropped. Moment and Orientation are named readings with no resolver yet.

The first composers can be deterministic. The claims are already fixed. A model is not required to arrange them. The Rendr model path that already writes a Frame or one Stage beat can later emit this same shape.
