# Scene Change

## ?? Purpose
Scene-change load mechanics for domain travel ? splash curtain with warm-skip and minimum hold. Shared opaque curtain also powers first-visit board load via `DomainShellGate`.

## ?? Key Files
- `DomainLoadCurtain.tsx` ? Opaque full-screen domain cover curtain (billing + tagline + shimmer)
- `SceneChangeCurtain.tsx` ? Re-export shim for `DomainLoadCurtain`
- `SceneChangeProvider.tsx` ? Travel orchestration; hides board children while curtain is active

## ?? Data & Behavior
- `isDomainShellWarm` / `prefetchDomainShellForTravel` in `domainShellCache.ts`
- `bootstrapDomainShell` / `isDomainShellReady` in `domainShellBootstrap.ts`
- Warm skip when prefetch completes within ~280ms; otherwise curtain holds ?480ms
- Curtain content from cached domain name, frame wordmark/tagline, cover image, and lead agent
- Travel: `SceneChangeProvider` renders curtain **instead of** board children (no bleed-through)
- Boot: `DomainShellGate` in V0Shell uses same curtain until shell ready

## ?? Notes & ToDo
- [x] First app boot curtain using domain cover (`DomainShellGate`)
- [ ] Mobile Playbill prefetch parity

## ?? Update Log
### 2026-07-24 ? cast-select-must-not-change-atmosphere
- Curtain full-page ambient uses domain cover only ? lead agent portrait no longer fills the viewport when cover is missing (portrait stays on the identity card).

### 2026-07-16 ? Cover-scale curtain + theme handoff
- Curtain layout matches public Cover (`max-w-5xl`, `min-h-[40vh]`, full-bleed ambient, large serif star) ? not a compact card
- Curtain registers `DOMAIN_THEME_SLUG` via `registerRuntimeTheme`; V0Shell prefers `peekDomainFrame` before DEFAULT
- StyleScope reads live runtime tokens each paint; board StyleScope remounts per domain so theme survives reveal

### 2026-07-16 ? Curtain = Playbill chrome; hold until board ready
- Curtain is a framed Playbill card (ambient + portrait) with inline domain theme CSS vars (portal-safe)
- Gate/travel await `prepareDomainBoardReveal` (shell + cover + dialog session + lead agent + nav warm) before reveal
- Playbill agent cache no longer wiped on switcher open; multi-domain prefetch + sync seed
- Board StyleScope uses `domain-resolved` tokens so theme matches curtain after reveal

### 2026-07-16 ? Playbill imagery + login curtain + user menu
- Curtain cover refreshes as shell cache fills; cover resolve uses objectTheme + frame background fallback
- Boot gate always brands first paint (?480ms) unless travel already showed a curtain
- Home/login resolve primary domain for branded curtain (not platform ke3p)

### 2026-07-15 ? Load sequence quality (P0?P3)
- Fail-closed boot gate with retry; require display name before reveal; prefer cover decode wait
- Shared `resolveDomainCoverUrl` / `resolveDomainShellDisplayName`; warm-skip aligned with readiness
- Dialog session prefetch during curtain/travel; Chronicle holds until `activeSessionId` (2.5s soft timeout)
- Auth loading uses `DomainLoadCurtain` when slug is known from path/host
- Guest/public Cover path still bypasses `DomainShellGate` by design (narrative Cover frame, not board curtain)

### 2026-07-12 ? Opaque load curtain + boot gate
- Added `DomainLoadCurtain` (97%+ opacity); removed slug/KE3P billing fallbacks during load
- `SceneChangeProvider` suppresses board mount during travel curtain
- Boot gate delegated to `DomainShellGate` in V0Shell

### 2026-07-09 ? Splash curtain v1
- Added curtain provider, warm-skip prefetch, Playbill Enter integration

### 2026-07-17 ? Travel curtain waits for Nav
- `isTravelBoardReady` requires `isBoardNavWarm` so domain travel does not skip the curtain while Nav is still empty.
