# domains (shared)

## 📌 Purpose
Shared constants and helpers for personal domain `frame_json` identity — detecting platform-default branding bleed and keeping API/web detection aligned.

## 🧱 Key Files
- `domainFrameIdentity.ts` — platform marker constants + `domainFrameLooksUnseeded`.

## 🔄 Data & Behavior
- Marker strings mirror API `DOMAIN_FRAME_FALLBACK` (GET `/api/domains/:slug/frame` empty-row fallback).
- `domainFrameLooksUnseeded` is used by web `V0Shell` auto-repair and API `provisionDomainOnCreate` re-seed decisions.

## ⚠️ Notes & ToDo
- [ ] If fallback shape changes, update markers here and in `domainFrameFallback.ts` together.

## 📆 Update Log
- 2026-07-01: Phase 1.4 — shared unseeded detection for wordmark, tagline, keeper_type, and kip defaults.
