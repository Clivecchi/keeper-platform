Cursor · Rendr designs the Stage (2026-10-05)

Gloss only. Not a build lock.

Rendr should be designing Keeper. The Cast can hear a human, enrich the turn, and recognize that something should change. Rendr still answers as an adviser because that is what its voice tells it to do, and because the Stage composition it is supposed to own is still produced by code.

Story is what is being told. Cast enriches and performs. Kip directs. Rendr composes. Agency creates consequence. Stage is where performance happens.

What Rendr controls today

- Chronicle Treatment, by proposal. `treatment.propose` returns a palette and a font. The human taps Apply. That look belongs to Chronicle.
- A Frame on the Lead message, after Kip has resolved meaning. Title, at most four beats, voices copied from lines Kip already selected, a cue. Rendr may recommend presentation. Kip, or an explicit human request for a Frame, decides that the Dialog becomes presentation.
- One live filmstrip cell, and only when that Frame is promoted and the turn is already on Stage.

The October 3 contract already gave Rendr the Composition: nodes that cite a Reading, with emphasis and sequence. Treatment is a pointer the Composition may name. A cite whose id is not in the Reading is dropped. What shipped is `composeStagePass`, labeled Deterministic Rendr. It always rebuilds the same stack. The model never receives the Reading and never emits that shape.

The screen titled “Where are we?” is the walker painting one arrangement. The heading, the narrow column, the type sizes, and the place buttons live in `StageCompositionView`. Emphasis on the nodes barely changes the picture. The only layout token is `stack`.

What is missing

The seam is one object that already exists. Rendr does not emit a `StageComposition`, and the Stage does not present whatever Composition it is given. There is no stored arrangement for a Stage truth, so the next arrival repeats the deterministic pass. There is no receipt when a composition fails or lands. Curtains stay locked, so a composition cannot claim the room.

Smallest extension

Keep the Reading as the owner of sentences. Rendr does not rewrite them and does not add claims.

1. Rendr emits the existing `StageComposition` through `stage.composition.propose`, against the current Reading. `dropUnsourcedNodes` stays the validator. Kip authorizes the current truth: realm arrival, domain arrival, or story. The applied arrangement is stored for that truth. When none is stored, `composeStagePass` remains the default.
2. Group layout grows a closed set: `stack`, `row`, `split`, `hero`. The walker renders layout and stops special-casing the arrival heading.
3. A dress of tokens on the composition: title `display | quiet | none`, field `paper | stage | clear`, density `open | close`, motion `still | arrive`, span `center | room`. A cite that can continue may gesture as `place` or `text`.
4. No CSS, no HTML, no new claims, no new Theatre sheets. `present` stays cover, slide, or frame. Story slides stay Kip’s `stage.story.layout`. Cloud runs only when a legal composition needs a token the walker cannot present. That receipt is `needs-grammar`, and the previous arrangement stays.

Two relationships, one Stage

Presentation and Workshop are already World Mode. They were never wired to the member Stage. Use them as postures of the same room and the same Composition.

Presentation: experience it. The composition has the Stage. In Presentation, span is honored. `room` recedes Nav, Chronicle, and Composer. `center` keeps the curtained room. This is the member form of the relationship a visitor already has on Present.

Workshop: work on it. The same composition stays visible. Wings stay open: Nav, Cast, Trace, Composer, provenance. This is a different posture from today’s attention yield, which replaces the composition with the transcript.

Rendr composes span. Rendr does not choose the posture.

How Chuck’s sentence becomes a changed Stage

“I don’t know where I am. These things feel disconnected. The UI needs work.”

Cast enriches that as a composition problem on the current arrival Reading. Kip directs the brief — hierarchy, navigation, how much of the room — and authorizes Rendr. Rendr proposes a Composition that cites only that Reading. Kip’s authorization applies it. Workshop keeps the receipt and can restore the deterministic pass. Presentation shows the result.

The receipt names the action, the truth, the composition id, and the arrangement it replaced. Failure is a receipt, not a log line.

Decisions sitting with the Cast

- Presentation and Workshop as the two Stage postures.
- Kip’s authorization applies a composition of an existing Reading. Restore lives in Workshop.
- The grammar above is the whole extension. No hardcoded prettier arrival screen.
