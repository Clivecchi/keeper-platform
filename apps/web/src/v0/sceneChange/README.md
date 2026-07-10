# Scene Change

## 📌 Purpose
Scene-change load mechanics for domain travel — splash curtain with warm-skip and minimum hold.

## 🧱 Key Files
- `SceneChangeCurtain.tsx` — full-screen billing + cover curtain
- `SceneChangeProvider.tsx` — travel orchestration and warm-skip predicate

## 🔄 Data & Behavior
- `isDomainShellWarm` / `prefetchDomainShellForTravel` in `domainShellCache.ts`
- Warm skip when prefetch completes within ~280ms; otherwise curtain holds ≥480ms
- Curtain content from cached domain name, cover, and frame lead agent

## ⚠️ Notes & ToDo
- [ ] First app boot curtain using anchor domain cover
- [ ] Mobile Playbill prefetch parity

## 📆 Update Log
### 2026-07-09 — Splash curtain v1
- Added curtain provider, warm-skip prefetch, Playbill Enter integration
