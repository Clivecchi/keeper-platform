# v0 lib

## 📌 Purpose
Shared runtime helpers for v0 surfaces — safe frame/context builders used by Universal Board and companion UI.

## 🧱 Key Files
- `buildExperienceAgentContext.ts` — tolerates partial domain `frame_json` when building Kip `agentContext`.

## 🔄 Data & Behavior
- Input: loaded `DomainFrameJson` + resolved audience role.
- Output: `AgentContext` for `KipApi.runAgent`, or `undefined` when no frame is loaded.

## ⚠️ Notes & ToDo
- [ ] Consolidate other frame→context builders here if duplicated again.

## 📆 Update Log

### 2026-06-28
- Added `buildExperienceAgentContext` — guards missing `directions`, `kip`, and `kip_context` on new/partial domains.
