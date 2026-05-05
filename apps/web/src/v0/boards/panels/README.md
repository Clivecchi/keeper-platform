# Panels — Universal Board

## 📌 Purpose
Shared panel components used by Universal Board. Each panel has a defined treatment character that governs not just what it shows but how it feels. These are not generic UI components — they are surfaces with intent.

## 🧱 Key Files
- `UniversalContextPanel.tsx` — Right panel: Living Multi-Context Surface

## 🔄 Data & Behavior

### UniversalContextPanel
**Treatment character: presence and intentional interaction.**

The right panel of Universal Board. Not a record viewer — where the domain breathes.

The Journey is alive over there while the conversation happens in the center. Not notifying. Not managing. Present — the way a good collaborator is present. Aware of what Path you are on, what Moments are moving, what threads are alive.

When context switches, the panel shifts in presence. Not with a data refresh — with a change in what comes forward and what recedes.

**Presence surfaces:**
| Surface | Triggered by | What comes forward |
|---|---|---|
| `DomainPresence` | idle (nothing selected) | Active journeys, what is moving |
| `JourneyPresence` | `selectedJourneyId` | Paths, Moments, threads |
| `MomentPresence` | `selectedMomentId` | Narrative, journey context |
| `KeeperPresence` | `selectedKeeperId` | Purpose, active journeys |
| `DraftPresence` | `selectedDraftId` | Title, status, summary |

**Transition system:**
- `PresenceTransition` — CSS-driven exit/enter sequence
- Exit: 140ms, opacity → 0, translateY(3px)
- Enter: 200ms, opacity → 1, translateY(0) from translateY(-2px)
- No JS animation library — all CSS transitions

**Data:** Each surface fetches its own data. The panel is self-sufficient. `domainId` is always received as a prop (resolved at board root, never by panels).

**Rendr input:** The `presenceTreatment` field in `UniversalBoardDef.contextSurface.viewStates` carries free-form treatment instructions to Rendr. Spatial ratios, motion behavior, density, what recedes and what comes forward — those are Rendr's answer to this text.

## ⚠️ Notes & ToDo
- [ ] Agent presence surface — for Agent Board's agent selection state
- [ ] Service presence surface — for IDE Board's ServicesFrame integration
- [ ] Rendr integration — spatial ratios and density governed by presenceTreatment

## 📆 Update Log
### 2026-05-04 — Universal Board: Full Definition with Treatment
- Created `panels/` directory under `v0/boards/`
- Created `UniversalContextPanel.tsx` — right panel Living Multi-Context Surface
  - Five presence surfaces: Domain, Journey, Moment, Keeper, Draft
  - `PresenceTransition` component — CSS-driven context shift animation
  - Self-sufficient data fetching per surface
  - Reads from `UniversalBoardContext` via `useUniversalBoardOptional()`
  - All colors via `hsl(var(--theme-*))` only
