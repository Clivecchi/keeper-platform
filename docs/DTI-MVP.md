# Dash to MVP — Development Canvas

## Purpose

This document defines the **Dash to Iteration (DTI)** phase and its bridge into the true **Keeper MVP**. It exists to prevent further design and tooling drift, align Cursor/Kip behavior, and restore forward momentum while preserving the previously defined MVP objective.

---

## Keeper MVP — Locked Objective

**Objective:**
Deliver a publicly accessible Keeper experience that allows a user to arrive at a domain, understand where they are, navigate core surfaces (Domain → Board → Frame → Content), engage with content, and exit or return without confusion, presented in an aesthetically pleasing and intentional manner.

**Design Requirement:**
The experience must be visually calm, ordered, readable, and cohesive, with deliberate layout, spacing, typography, and navigation that feel complete and trustworthy rather than experimental.

**Completion Test:**
A first-time user can arrive at a public domain, orient themselves, move through primary surfaces, interact with content, and leave or return without friction, without the experience feeling fragmented or visually unfinished.

---

## Dash to Iteration (DTI) — Definition

DTI is a **structural stabilization phase**, not MVP delivery.

DTI exists to make iteration safe.

DTI prioritizes:

* Structural correctness
* Layout stability
* Predictable navigation
* Non-invasive agent presence
* Theming predictability

DTI explicitly does **not** optimize for final aesthetic, emotional tone, or feature completeness.

---

## DTI Exit Criteria (Locked)

DTI is complete when **all** of the following are true:

1. `/v0` reliably renders **Domain → Board (Cover) → Frame (Moment)** without layout regressions
2. Frame templates (Cover, Moment) are structurally stable:

   * no overlap with writing area
   * sacred writing space is preserved
   * close/return paths are consistent and functional
3. Platform navbar is present and consistent, including **Login** under the menu/dropdown
4. A single **Visual Style engine** exists and applies predictably (even if visually basic)
5. Agent presence is:

   * small
   * persistent
   * non-blocking
   * repositionable without layout breakage

When these are true, structural risk is considered contained.

---

## MVP Entry Criteria

Work may transition from DTI to MVP when:

1. Navigation flow matches MVP intent: **Domain → Board → Frame → Content → Return**
2. First-time users can orient without explanation
3. Visual presentation is calm, ordered, and cohesive (not final, but trustworthy)
4. Frame templates and props can be modified without page redesign
5. Visual Styles are clearly scoped and understood (platform vs surface)

---

## Enforcement Rule (Non-Negotiable)

**DTI work may change structure; MVP work may change meaning.**

Kip and Cursor must enforce this distinction.

---

## Visual Styles (DTI Scope)

* Visual Styles are **surface-level presentation layers**
* Styles are driven by **Lens-backed tokens**, but wiring may follow later
* Initial focus: Moment + Cover surfaces only
* One starter style is sufficient (e.g., "Diary Paper")

Styles must not alter structure during DTI.

---

## Known Deferrals (Explicitly Out of Scope for DTI)

* Perfect diary warmth
* Full Lens wiring across entities
* Public domain completeness
* Feed behavior
* Advanced agent interactions

These belong to MVP or post-MVP phases.

---

## Current Working Surfaces

* `/v0` routing surface
* Board (Cover) frame
* Moment frame

These are the only surfaces in active DTI scope.

---

## Outcome of This Canvas

This document is the **authoritative guardrail** for the Dash to Iteration and the bridge into the real Keeper MVP. Any work that violates these boundaries must be paused or reclassified.
