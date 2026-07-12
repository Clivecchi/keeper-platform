# Scene Change

## 📌 Purpose
Scene-change load mechanics for domain travel — splash curtain with warm-skip and minimum hold. Shared opaque curtain also powers first-visit board load via `DomainShellGate`.

## 🧱 Key Files
- `DomainLoadCurtain.tsx` — Opaque full-screen domain cover curtain (billing + tagline + shimmer)
- `SceneChangeCurtain.tsx` — Re-export shim for `DomainLoadCurtain`
- `SceneChangeProvider.tsx` — Travel orchestration; hides board children while curtain is active

## 🔄 Data & Behavior
- `isDomainShellWarm` / `prefetchDomainShellForTravel` in `domainShellCache.ts`
- `bootstrapDomainShell` / `isDomainShellReady` in `domainShellBootstrap.ts`
- Warm skip when prefetch completes within ~280ms; otherwise curtain holds ≥480ms
- Curtain content from cached domain name, frame wordmark/tagline, cover image, and lead agent
- Travel: `SceneChangeProvider` renders curtain **instead of** board children (no bleed-through)
- Boot: `DomainShellGate` in V0Shell uses same curtain until shell ready

## ⚠️ Notes & ToDo
- [x] First app boot curtain using domain cover (`DomainShellGate`)
- [ ] Mobile Playbill prefetch parity

## 📆 Update Log
### 2026-07-12 — Opaque load curtain + boot gate
- Added `DomainLoadCurtain` (97%+ opacity); removed slug/KE3P billing fallbacks during load
- `SceneChangeProvider` suppresses board mount during travel curtain
- Boot gate delegated to `DomainShellGate` in V0Shell

### 2026-07-09 — Splash curtain v1
- Added curtain provider, warm-skip prefetch, Playbill Enter integration
