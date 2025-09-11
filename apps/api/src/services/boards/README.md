# Domain Boards Services

## 📌 Purpose
Service logic for domain-scoped boards, including idempotent ensure/hydration of the Domain Management Board (DMB).

## 🧱 Key Files
- `domainManagement.ts`

## 🔄 Data & Behavior
- Ensures exactly one board per domain for `boardType = 'domain-home'`
- Deterministic frame IDs based on `(domainId + frameKey)`
- Props-first frame identity; layout is orthogonal

## ⚠️ Notes & ToDo
- [ ] Verify final frame props and keys with Kip
- [ ] Extend with additional domain frames in future

## 📆 Update Log
- 2025-09-11: Added `ensureDomainManagementBoard(domainId)` with deterministic frames and idempotent behavior.
