# Mobile hooks

## 📌 Purpose
Viewport and surface helpers for Keeper’s adaptive mobile board.

## 🧱 Key Files
- `useIsMobile.ts`
- `useVisualViewportHeight.ts`
- `visualViewportMetrics.ts`
- `useMobileSurface.ts`
- `useMobileKipDialogStage.ts`
- `useUniversalMobile.ts`

## 🔄 Data & Behavior
`useVisualViewportHeight` writes `--keeper-vvh` so the adaptive board shell shrinks with the software keyboard. `visualViewportMetrics` is the testable mapping.

## ⚠️ Notes & ToDo
- [ ] Confirm iOS Safari keyboard + URL bar on a physical device

## 📆 Update Log

### 2026-09-12 — Visual viewport lock
- Added `useVisualViewportHeight` + `visualViewportMetrics` so the docked composer stays on screen.
