# queries

## 📌 Purpose
Shared database query helpers for Kip agents and related records (sessions, messages, logs).

## 🧱 Key Files
- `index.ts`
- `index.js`
- `index.d.ts`

## 🔄 Data & Behavior
- Wraps Prisma operations for Kip agents, sessions, and messages.
- Exposes session fetch, creation, timestamp updates, and metadata update helpers for services.
- Returns lightweight relations (agent, user, message counts) to keep API responses consistent.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-12-11: Added session metadata updater to surface topic/summary/tags through the API.

