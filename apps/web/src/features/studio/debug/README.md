# Studio Debug

## 📌 Purpose
Provide a unified, toggleable debug panel for Board Studio combining Board/Frame verification and Auth/Network overview.

## 🧱 Key Files
- `StudioDebug.tsx`
- `useStudioDebug.ts`

## 🔄 Data & Behavior
The panel displays current `boardId`, `activeFrameId`, UI prop count, server-side frame counts, last save payload/response, and a ring buffer of recent API calls. It fetches frames from `/api/frames/instances/board/:boardId` and records saves via an imperative API exposed by `useStudioDebug`.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-10-14: Initial creation of unified Studio Debug module and hook. // TODO: Verify and describe assumptions

