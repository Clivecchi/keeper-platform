Cursor · Frame vs Slide — first filmstrip cell (2026-08-30)

Gloss-only on the lock. The first Slide is on Stage in this same turn. Does not create Points.

Chuck asked where the story is, where the first Frame is, and whether we are waiting. We were waiting. That was the mistake.

Lock
- **Frame** is the room — Stage, Present, Cover. Already in jsonframe. Do not call each film cell a Frame.
- **Slide** is one cell of the filmstrip. **SlideType** is the layout contract. `text_slide` is already specified: editorial text for story beats. Do not invent Now as a type.
- Now is one card that may appear on a Slide. The title that already exists (Talking in — Finding the Plot — or the Stage name) is Slide 1.
- Objects on Stage stay assets. They are not the filmstrip.

What shipped
- Stage shows a filmstrip. Slide 1 is the existing title. After you speak, Slide 2 is the current beat as `text_slide`.

Not a build lock on Theatre, persistence, or more SlideTypes. Next cells come from assets and Turns — still Slides, still no new type until a new layout is real.
