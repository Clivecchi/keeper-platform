# Retired — IDE Board folder

## 📌 Purpose
This folder is retired. Build is a Board (`?board=build`). Runtime id is `build`. `?board=ide` is a URL alias only.

## 🧱 Key Files
- See `../build/BuildBoard.tsx` and `BUILD_BOARD_DEF` in `UniversalBoardDefinition.ts`.
- `IntegratedServicesBar` lives in `../components/IntegratedServicesBar.tsx`.

## 🔄 Data & Behavior
V0Shell renders `<UniversalBoard def={matchedDef} />`. This folder no longer contains live board code.

## ⚠️ Notes & ToDo
- [ ] Remove this folder after a later pass if git history is enough.

## 📆 Update Log
- 2026-08-19: Deleted unused IDE wrappers (`IDEBoardContext`, `IDEDraftPanel`, `IDEBannerActions`, `KeeperPanel`, `ideBoardTypes`). Canonical Board is `build/`.
