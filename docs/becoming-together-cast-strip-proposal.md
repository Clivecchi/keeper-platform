# Becoming Together — Cast Strip Proposal

**Keeper Platform · Design proposal, for Rendr review · July 22, 2026**

Not built. This is a mockup-stage idea, worked out in an artifact (not real code), proposed here for Rendr's read before anyone considers it for the real Chronicle/Document surface.

## The problem it's answering

The Document (Chronicle panel of a Dialog) had drifted into reading like a report: a Forward/Objective card, then a vertical accordion of Points grouped into four Paths (Progress, Known Issues, Development, Present/Experience), each a title plus a paragraph. Functionally correct — Point → Path → Document, Forward/Step lineage all intact — but Chuck's read on it, verbatim: it "still feels like we are presenting War and Peace instead of a Sunday comic." A second, related complaint: "the path forward isn't super clear" — the Forward/Step block sat visually separate from the Path list below it, and its Back/Forward buttons were permanently disabled, so "Forward" read as an inert label, not something you could act on.

Two distinct problems, one fix: too much prose per Point, and no visible, usable thread connecting one Point to the next.

## The concept: one strip, not a report

Replace the vertical Path-accordion with a single horizontal, scroll-snapping row of panels — a film/comic strip read left to right. Every Point becomes one panel. The Forward/Objective and its current Step fold into panel one of the same strip, instead of living in a separate card above it — so "reading forward" is now literally scrolling right through the strip, one panel at a time.

```
[ Forward + Step ] → [ Point ] → [ Point ] → [ Point ] → [ Point ] → ...
     panel 00          panel 01    panel 02    panel 03    panel 04
```

A thin sprocket-hole texture runs above and below the strip — a small, deliberate nod to the film-strip idea, not decoration layered on top of it.

## Every Point gets a byline

The core change underneath the visual one: each Point is now attributed to whoever actually said or built it, not filed anonymously into a category. A small colored top-edge + monogram mark + name + role sits on every panel:

| Cast member | Role | Color |
|---|---|---|
| Kip | Platform Director | amber (existing) |
| Cloud | Lead Engineer | dusk blue-grey (existing) |
| Rendr | Design | violet (existing) |
| Ceox | Personal Agent (Chuck's) | rose — **new token**, distinct from Cloud's cool grey and the alarm-adjacent clay already in use |
| Chuck | Admin | neutral ink — deliberately no "brand" color, he's a person, not a product surface |
| Cursor | External, via Cloud handoff | **no color at all** — see below |

This turns the Document into a real multi-cast artifact rather than a single authorial voice summarizing everyone else's work.

## Cursor gets a seat, and a deliberately different one

Cursor's contributions (the actual code changes) had no visible presence anywhere in the product before this. Two of the strip's panels are Cursor's, showing real excerpts from the prompts sent to it — not paraphrased, the actual opening line and the one hard constraint from each.

Cursor is drawn with a dashed top border and no assigned hue, on a subtle diagonal-hatch fill, rather than a color from the cast palette. The visual logic: everyone else in the cast is a native voice inside the Dialog; Cursor works through a different channel entirely (a handoff document, not a live turn), and the treatment should say that at a glance rather than pretend Cursor is just another chip.

## Ceox's frame is honest, not invented

Rather than skip Ceox for lack of real content, it gets its own panel: "The one seat still empty" / "Answers on no domain yet — including its own. Honest, not filled in." This is the same discipline the rest of the Document already holds itself to (verify before asserting) applied to the cast strip specifically — an empty seat is real information, and dressing it up would be less true than naming it.

## Interaction model

- The strip is native horizontal scroll (snap-to-panel), plus explicit ‹ › buttons that page one panel at a time — this replaces the old disabled Back/Forward pair with something that actually does something.
- Clicking a panel opens a small "caption card" below the strip: a slightly tilted, pinned-index-card treatment, a couple of short lines, the real prompt excerpt for Cursor panels, and the existing Gloss action (sends the Point into the live Dialog as a real thread starter — unchanged mechanism, just reached from a different anchor now).
- An "open threads" ledger stays underneath everything, visually distinct (unstyled list, no panel treatment) — for what's genuinely unresolved (Ceox's silence, Phase 2 delegation, queued work). Deliberately kept out of the strip itself so the strip only ever tells the story of what's actually happened.

## What this doesn't change

Forward/Step's own glass/blur visual treatment (the "current tip of the lineage" look) is unchanged — it was already distinct and working, just relocated into panel one instead of sitting above the strip as a separate block. The Nav and Dialog panels either side of the Document are untouched; this proposal is scoped to the Chronicle/Document surface only.

## Open questions for Rendr

1. Does a byline-per-Point, cast-colored strip hold up as a pattern beyond this one Document — i.e., should Library/Kept surfaces eventually carry the same cast-attribution idea, or is this specific to Dialog-scoped Documents?
2. Is a dashed/hatched "guest" treatment the right visual language for Cursor, or is there a cleaner way to signal "external channel" that Rendr would rather use elsewhere too (e.g., for other non-native integrations later)?
3. Panel width is fixed (~164px) for scroll-snap regularity — does that hold at real content lengths, or does it need to flex per-panel once real Points (not curated examples) are flowing through it?
4. The reel is currently a flat chronological list. Once Paths (Progress/Known Issues/Development/Present-Experience) need to coexist with cast attribution, does the strip need a second axis (filter by Path, still ordered by time), or does Path stop being a first-class grouping in this model?

## Reference

Live mockup (artifact, not real code): `https://claude.ai/code/artifact/61b11013-9543-4685-8340-c847c4830348`
