# Keeper Re-Center Blueprint (Architect + Designer)

## Purpose
Re-center Keeper on its **frame-first, domain-scoped, v0-structured** public MVP loop—without losing the already-captured details. This document is a **return to a known starting point** (we’ve been here before), now expressed as an **architectural blueprint** that other canvases and specs must align to.

---

## North Star Statement
Keeper exists to help people **capture moments worth keeping** and move through a calm, cohesive experience of **Capture → Connect → Create → Build**.

The MVP proves this is real by delivering a **public domain experience** where a person can:
- Arrive
- Understand where they are
- Navigate intentionally
- Create and keep a Moment
- See proof it exists
- Return with confidence

---

## MVP Loop Definition (Locked)
**For MVP, the loop is complete when** you can **fully manage and deploy an aesthetically pleasing public presentation** using an **easily navigated Domain Board and Frames**, where the domain navigation exposes key frames and the experience feels intentional (not experimental).

### MVP Completion Tests
A first-time user can:
1) Land on a public domain
2) Access the domain navigation
3) Open the required frames
4) Create a Moment (draft → saved → kept)
5) See a domain-scoped proof of kept moments
6) Return to the Cover and continue navigation without confusion

---

## System Surfaces (What exists in MVP)
Keeper is understood as a **Domain-scoped UI system** composed of:

### 1) Domain
- The scope of ownership, routing, resolution, and permissions.
- Resolves content and behavior via domain context (slug/id).

### 2) Board
- The public presentation surface for a domain.
- A calm entry to frames, not a management console.

### 3) Frames (Primary UX)
Frames are the **unit of experience**.
- v0 is the structural grammar of frames.
- The Moment frame is the current best exemplar.

### 4) Routes (Public MVP path)
- `/d/:domainSlug` is the public domain entry.
- Frame switching is query-based (e.g., `?frame=moment`).

---

## Required Frames (MVP Domain Navigation Contract)
The domain navigation must expose at minimum:

1) **Cover**
- Entry surface
- Primary call-to-action(s)

2) **Moment**
- The core capture frame
- Must support draft lifecycle and keep action

3) **Agent (Kip)**
- Not a novelty chat
- A deeply integrated, frame-native assistant seam

4) **Domain Config**
- Public-facing configuration that affects presentation (as allowed)

5) **Diagnostics**
- Frame-first diagnostics surface
- Copyable snapshots
- Supports hunt/peck/paste reduction

**Note:** “If a frame matters, it must be discoverable from the Domain.”

---

## v0 Structure Contract
v0 is not a theme.

### v0 provides:
- Frame layout grammar
- Spacing, typography rhythm, calm surface doctrine
- Predictable placement of controls and navigation

### Theming provides:
- Palette, texture, tone, and mood
- Domain/Journey/Path/Moment-derived hierarchy (future), but **must not change the frame grammar**

### Exemplars
- Moment frame = the current structural reference implementation.
- Design Frame = the mechanism to manage and apply v0 structure + themes (planned/partial).

---

## Moment Pipeline Contract (Core MVP Behavior)
A Moment must be a reliable lifecycle with domain-scoped truth.

### Minimum states
- **Draft**: created and auto-saved
- **Kept**: committed as a kept moment (timestamped)

### MVP reliability requirements
- Draft creation must be possible in correct domain scope
- Autosave must work (debounce ok)
- Keep must succeed and return a response
- There must be a **Feed/Proof surface** to confirm kept moments exist

---

## Public Moments Onboarding (Option 1 — Locked)
**Allow anonymous draft creation in a domain scope** (domainSlug required) and tie it to a temporary **public author/session key** until claimed.

### Required properties
- Domain-scoped from the start
- Anonymous identity represented by `anonKey` / claim token
- Claim flow exists for later authentication

### MVP intent
- Public capture should feel like a welcoming “engagement game” (e.g., ke3p key), not a dead end.

---

## UI Reality and Transition Policy
Keeper currently has:
- Two primary UI designs (v0 and “current UI”)
- A third legacy UI that should be replaced soon

### Policy
- Legacy UI is allowed only until it blocks progress.
- We will not debug legacy UI endlessly.
- The **goal is to rebuild the entire UI using the v0 pattern**.

### Early convergence requirement
- **Singular login**: old and new auth flows must converge.
- Dual auth surfaces create inconsistent state and must be eliminated early.

---

## Diagnostics Contract (Effectiveness over heroics)
If we must hunt/peck/paste, we reduce waste with diagnostics.

Diagnostics must:
- Be frame-first and domain-accessible
- Provide copyable snapshots (auth, domain, network, errors)
- Provide a moment pipeline test (draft/update/keep + anon claim)
- Support Kip debug mode later

---

## Kip Contract (Protocol, not persona)
Kip = Keeper Interface Protocol.

### MVP seam
- Kip must have a **frame-native** place to operate.
- Kip Debug Mode must be useful (modes, limits, consistent tool usage).

### Known blocker
- Kip’s primary failure mode is inconsistent tool wiring/usage, not “intelligence.”

---

## Design Frame Contract (Do not lose it)
The Design Frame is a first-class system surface.

Purpose:
- Establish and enforce v0 structural grammar
- Apply themes correctly
- Support building cohesive frames beyond Moment

MVP stance:
- Keep it visible and aligned; do not let it drift into “later.”

---

## Architectural Guardrails (Non-negotiables)
1) **Frame-first:** all primary interactions happen in frames.
2) **Domain-scoped truth:** every meaningful action resolves a domain context.
3) **Single navigation contract:** domain nav exposes required frames.
4) **Single auth surface:** avoid split-brain auth.
5) **v0 grammar:** structure is consistent; theming is layered.
6) **Proof of keep:** the system must show that moments were kept.
7) **No endless debugging:** diagnostics exist to shorten the loop.

---

## Where This Document Sits
This Re-Center Blueprint is the **primary alignment document**.
- Other canvases (spines, frame specs, onboarding, diagnostics, design frame, kip modes) must **support and not contradict** this blueprint.
- When conflict appears, we reconcile to this blueprint first.
