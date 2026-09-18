# types

## 📌 Purpose
API-local TypeScript types for integrations and related route contracts.

## 🧱 Key Files
- `integration.ts` — Integration tiers, slugs, and AI Model gateway list (`AI_MODEL_INTEGRATION_SLUGS`)

## 🔄 Data & Behavior
`AI_MODEL_INTEGRATION_SLUGS` is the hardcoded list of AI providers that Chronicle treats as connected gateways. It must stay aligned with `MODEL_PROVIDERS` in `@keeper/database`.

## ⚠️ Notes & ToDo
- [ ] Consider deriving this list from `MODEL_PROVIDERS` so the two cannot drift

## 📆 Update Log
### 2026-09-17 — TypeSafe gateway
- `AI_MODEL_INTEGRATION_SLUGS` includes `typesafe`.
