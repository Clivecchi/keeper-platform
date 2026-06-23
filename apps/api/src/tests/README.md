# API Tests

## 📌 Purpose
Focused Vitest coverage for API-side behavior that is narrow enough to test without booting the full Express server.

## 🧱 Key Files
- `draft-trigger-detector.test.ts` - Covers draft-trigger detection and read-only/no-change escape hatches.
- `smoke/` - Smoke tests for API endpoints and system behavior.

## 🔄 Data & Behavior
Tests import API modules directly where possible and use Vitest assertions. Behavior that depends on external services should be mocked or exercised through smoke tests.

## ⚠️ Notes & ToDo
- [ ] Expand direct unit coverage around Kip action execution policy handling.
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-06-23: Added draft-trigger detector coverage for read-only/no-change instructions so Kip does not force draft actions for explicitly non-mutating requests.
