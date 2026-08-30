# V0 Themes

## ?? Purpose
Houses the theme resolution pipeline for the V0 frame layer. This folder converts theme identifiers and domain JSON into CSS variable token sets that StyleScope renders.

## ?? Key Files
- `constants.ts` ? `DOMAIN_THEME_SLUG`, `DEFAULT_BASE_THEME_SLUG` (`gray-earth`).
- `themeRegistry.ts` ? Static registry of bundled themes (`gray-earth`, `neutral`, `diary-paper`).
- `themeResolver.ts` ? Resolves a slug ? `ThemeTokens`. Strategy: (0) runtime cache ? (1) static registry ? (2) API fetch. Exports `registerRuntimeTheme()` for domain-resolved theme injection.
- `domainThemeResolver.ts` ? Bridges `DomainFrameTheme` (from domain JSON) to `ThemeTokens`.
- `hierarchyThemeResolver.ts` ? Moment ? Path ? Journey ? Keeper theme_id walk; merges DB theme over domain tokens.
- `useBoardThemeRegistration.ts` ? Hook used by `UniversalBoard` to re-register tokens when board selection changes.
- `presets/grayEarth.tokens.ts` ? Canonical gray earth tone token set (platform default).
- `ThemeSwitcher.tsx` ? Developer UI component; updates `?theme=` URL param. Remains a developer preview tool.
- `extractImagePalette.ts` — canvas sample of a File or image URL.
- `applyDomainVisualFromImage.ts` — Domain cover upload → cover + extracted Treatment + theme colors (and a Library row for the shelves).
- `surfaceLookStore.ts` — surfaced Library look overlay (not written back to the Domain).
- `atmosphereContrast.ts` — glass alphas + must-read vs muted ink when a cover sits behind the board.

## ?? Data & Behavior

### Theme Resolution Pipeline

```
DomainFrameJson.theme (colors, fonts, background)
  ? resolveDomainThemeSync(domainTheme, colorScheme)  [domainThemeResolver.ts]
    ? registerRuntimeTheme('domain-resolved', tokens)  [themeResolver.ts]
      ? V0Shell on load; UniversalBoard hook on selection change

Board selection (Moment / Path / Journey / Keeper theme_id)
  ? hierarchyThemeResolver.ts ? merge over domain tokens
    ? registerRuntimeTheme('domain-resolved', tokens)

URL ?theme= param ? bypasses domain resolver ? reads static themeRegistry directly
                  ? developer preview only

StyleScope: effectiveStyleId = gray-earth when domain-resolved (Warm Dark via ?style=neutral only)
  ? resolveThemeTokens('domain-resolved') ? tokensToCSSVars() ? --theme-* CSS vars
```

### Color Mapping (domain JSON ? tokens)
- `colors.primary` (hex) ? `ink.primary`, `ink.secondary`, `ink.tertiary`
- `colors.accent` (hex) ? `focus.ring`, `hover.surface`, `press.surface`
- `colors.surface` (hex) ? `surface.page`, `surface.paper`, `surface.panel`, `surface.elevated`
- Dark mode: surface tokens darkened (8-18% lightness), ink tokens lightened (38-92%)

### Font Gap (Pass 2)
`domainTheme.fonts.display` and `domainTheme.fonts.ui` are present in domain JSON but are not wired to any `--theme-*` CSS variable. `ThemeTokens` has no font-family keys and `tokensToCSSVars` does not emit font vars. Font wiring is deferred to Pass 2.

## ?? Notes & ToDo
- [x] Image upload → palette extraction → `frame_json.treatment` + `theme.colors` (client canvas; `themes.source_image` table still unused).
- [ ] Persist extracted palette onto `themes.source_image` when Theme records are wired.
- [ ] Pass 2: Add font-family token keys to ThemeTokens and wire domain fonts.display / fonts.ui.
- [ ] Pass 2: Add dark mode base theme to themeRegistry for `neutral-dark` instead of computed inversion.
- [ ] Consider adding `clearRuntimeTheme('domain-resolved')` on domain unmount (not needed until multi-domain per session).

## ?? Update Log

### 2026-08-30 — Atmosphere contrast is a theme-engine step
- `atmosphereContrast.ts` derives sealed glass alphas and a wider ink spread (primary = must-read, tertiary = muted) when a cover / atmosphere image is present.
- `resolveDomainThemeSync` accepts `{ hasAtmosphere }` and overlays those tokens. V0Shell / board registration pass the Domain cover URL.
- Board `themeApply=treatment` still keeps Warm Dark surfaces; it now takes contrast tokens so type can hold a reading plane over a busy photo.

### 2026-08-30 — Domain cover is the floor; surfaced items overlay
- Hierarchy: Domain cover → Domain Treatment / theme. A Library image overlays only while that item is Chronicle/Present subject. Moment → Path → Journey → Keeper `theme_id` still walks over Domain tokens. Cast never changes atmosphere.
- Cover upload still extracts and writes the Domain look. Library `+` only shelves the file.

### 2026-08-30 — Image upload extracts the domain look
- `extractImagePalette` / `applyDomainVisualFromImage` sample the **Domain cover**, write cover + Treatment + theme colors.
- `domainThemeResolver` flips ink from the domain surface luminance so a dark extracted atmosphere is readable in a light OS scheme.

### 2026-07-24 ? cast-select-must-not-change-atmosphere
- `useBoardThemeRegistration` no longer depends on the full board `selection` object (instruments/cast). Hierarchy walk uses `BoardThemeHierarchySelection` only.
- Prevents engaging a cast member (e.g. Ceox on ke3p) from thrashing the global `domain-resolved` theme slot.

### 2026-06-29 ? Gray Earth default + hierarchy resolution
- Added `gray-earth` preset, DB seed, and `styleRegistry` style id (platform default for unbranded domains).
- `domainThemeResolver` base fallback is now `gray-earth` instead of light `neutral`.
- `hierarchyThemeResolver` + `useBoardThemeRegistration` wire Moment ? Path ? Journey ? Keeper `theme_id` over domain tokens on Universal Board.
- V0Shell uses `effectiveStyleId=gray-earth` when domain-resolved (decouples from Warm Dark `?style=neutral` shell).

### 2026-03-08 ? Theme System Pass 1
- **domainThemeResolver.ts**: Created. Accepts `DomainFrameTheme` + `ColorScheme` + optional `baseThemeSlug`. Returns `ThemeTokens`. Exports `resolveDomainThemeSync` and `resolveDomainTheme`.
- **themeResolver.ts**: Added `registerRuntimeTheme(slug, tokens)` and `clearRuntimeTheme(slug)`. Added runtime cache check as step 0 in `resolveThemeTokens`. Existing static registry and API fallback paths unchanged.

### 2026-07-17 ? Reactive runtime theme handoff
- `themeResolver` notifies subscribers on `registerRuntimeTheme` / `clearRuntimeTheme` (version + listener set).
- Prevents Curtain ? Board theme freeze when StyleScope only read a non-reactive `Map`.
