# Agent Frame UI Analysis

**Date:** 2026-02-28  
**Scope:** Agent frame dialog workspace — text colors, background coloring, cover image enlargement

---

## Summary of Issues

1. **Text colors / low contrast** — Chat messages, timestamps, sidebar list items, and action receipt cards use hardcoded Tailwind classes or missing theme variables, causing poor readability.
2. **No unique background between chats** — Agent message bubbles and the dialogue area share nearly identical light backgrounds; messages blend together.
3. **Background image greatly enlarged** — Cover image uses `background-size: cover`, which scales a texture to fill the viewport and makes it appear enlarged and blurry.

---

## Root Cause Analysis

### 1. Theme System: Missing Dialogue Tokens When Using Theme Slug

**Location:** `apps/web/src/v0/styles/StyleScope.tsx` (lines 46–68)

When `themeSlug` is provided (e.g. `?theme=diary-paper`), `StyleScope` builds `baseTokens` from `themeRegistry`, which **only defines surface and ink tokens**:

- `themeRegistry` (`apps/web/src/v0/themes/themeRegistry.ts`) has: `surface.page`, `surface.paper`, `ink.primary`, `ink.secondary`, etc.
- It does **not** define: `dialogue.userBg`, `dialogue.agentBg`, `dialogue.areaBg`, `dialogue.border`.

`StyleScope` returns an incomplete token set and casts it as `StyleTokens`. The `dialogue.*` keys are missing. When `tokensToCSSVars()` runs, it accesses `tokens['dialogue.agentBg']` etc., which are `undefined`, leading to invalid or missing CSS variables.

**Impact:** `--theme-dialogue-*` variables are not set when a theme is selected. Components fall back to inline defaults, which may not match the active theme and can cause contrast issues.

**Fix:** Merge theme tokens with style registry tokens so dialogue tokens are always present. For example:

```ts
// In StyleScope baseTokens when themeTokens exists:
const styleDefinition = getStyleDefinition(styleId)
const styleTokens = styleDefinition?.tokens ?? defaultTokens
return {
  ...styleTokens,  // Start with full set (includes dialogue)
  ...themeTokens,  // Override with theme surface/ink only
} as StyleTokens
```

---

### 2. DialogueMessageList: Hardcoded Colors and Poor Bubble Contrast

**Location:** `apps/web/src/components/agent/DialogueMessageList.tsx`

| Element | Current | Issue |
|---------|---------|-------|
| Agent message text | `text-gray-900` | Ignores theme; may clash with theme colors |
| Agent message timestamp | `text-gray-500` | Very light gray, poor contrast |
| Agent bubble background | `var(--theme-dialogue-agent-bg, white)` | White on light area bg → little separation |
| Dialogue area background | `var(--theme-dialogue-area-bg, hsl(35, 33%, 97%))` | Nearly same as agent bubble |

**Fix:**

- Use theme variables for text: `style={{ color: 'var(--theme-ink-primary)' }}` for agent content, `var(--theme-ink-tertiary)` for timestamps.
- Give agent bubbles a distinct background: e.g. `hsl(var(--theme-surface-paper))` or a slightly darker shade than the area.
- Add a subtle border or shadow to agent bubbles for separation.

---

### 3. SidebarCard: List Item Contrast

**Location:** `apps/web/src/v0/components/SidebarCard.tsx` (line 128)

List items use `SURFACE.inkSecondary` (`var(--theme-ink-secondary)`). If theme resolution fails or dialogue tokens are missing, these variables may not resolve correctly.

**Fix:** Ensure `StyleScope` always provides valid theme variables (see §1). Consider using `ink.primary` for clickable items and `ink.secondary` only for less important text.

---

### 4. ActionReceiptCard: Hardcoded Gray

**Location:** `apps/web/src/components/kip/ActionReceiptCard.tsx` (line 95)

Uses `text-gray-700`, which bypasses the theme system.

**Fix:** Use `style={{ color: 'var(--theme-ink-primary)' }}` or `var(--theme-ink-secondary)` instead.

---

### 5. Background Image Enlargement

**Location:** `apps/web/src/v0/frames/DesignFrame.tsx` (lines 86–94)

```ts
backgroundSize: "cover",
```

`background-size: cover` scales the image to cover the entire viewport while keeping aspect ratio. For a texture (e.g. stone, fabric) that is smaller than the viewport, this causes strong scaling:

- On a 1920×1080 screen, a 500×500 texture is scaled up ~4×.
- The texture appears enlarged and blurry.

**Fix options:**

1. **Higher-resolution cover images** — Use images at least as large as the target viewport.
2. **Alternative sizing for textures** — For texture-style images, consider:
   - `backgroundSize: "auto"` with `backgroundRepeat: "repeat"` for tiling
   - Or a fixed size, e.g. `backgroundSize: "1200px auto"`, to limit scaling
3. **Domain-level option** — Add a theme setting for cover image behavior (cover vs. tile vs. contain).

---

## Theme Flow Overview

```
URL ?theme=diary-paper
    → StyleScope(themeSlug="diary-paper")
    → resolveThemeTokens("diary-paper")
    → themeRegistry returns tokens (no dialogue.*)
    → baseTokens = partial object (missing dialogue)
    → tokensToCSSVars(finalTokens)
    → --theme-dialogue-* undefined or invalid
    → DialogueMessageList, ActionReceiptCard use fallbacks
```

When `themeSlug` is null, `StyleScope` uses `getStyleDefinition(styleId)`, which returns full tokens including `dialogue.*`. That path works correctly.

---

## Recommended Fix Order

1. **StyleScope** — Merge theme tokens with style registry so dialogue tokens are always present.
2. **themeRegistry** — Add `dialogue.*` tokens to diary-paper and neutral themes for consistency.
3. **DialogueMessageList** — Replace hardcoded Tailwind colors with theme variables; improve agent bubble contrast.
4. **ActionReceiptCard** — Replace `text-gray-700` with theme variables.
5. **Cover image** — Adjust `backgroundSize` or add theme options for texture-style covers.

---

## Root Cause: Invalid CSS Variable Usage (2026-02-28)

**The theme variables hold HSL components** (e.g. `"0 0% 9%"`), not full color values. Using `color: var(--theme-ink-primary)` produces invalid CSS (`color: 0 0% 9%`). Valid usage requires `hsl(var(--theme-ink-primary))` or a pre-wrapped variable.

**Fix applied:** Added `--theme-ink-primary-color`, `--theme-ink-secondary-color`, `--theme-ink-tertiary-color` to `tokensToCSSVars` (full color values). Updated all components to use these `-color` variables for `color` and `backgroundColor` properties. Updated `index.css` @theme to use the correct format with fallbacks.

---

## Implementation Status (2026-02-28)

All fixes have been implemented:

| File | Change |
|------|--------|
| `apps/web/src/v0/styles/StyleScope.tsx` | Merge theme + style tokens so dialogue tokens exist |
| `apps/web/src/v0/themes/themeRegistry.ts` | Add dialogue tokens to themes |
| `apps/web/src/components/agent/DialogueMessageList.tsx` | Use theme vars for text; improve agent bubble contrast |
| `apps/web/src/components/kip/ActionReceiptCard.tsx` | Use theme vars instead of `text-gray-700` |
| `apps/web/src/components/kip/DraftUpdateProposeCard.tsx` | Use theme vars for text and borders |
| `apps/web/src/v0/frames/DesignFrame.tsx` | Support `coverImageMode: "tile"` for textures |
| `apps/web/src/v0/components/cover-frame.tsx` | Support `coverImageMode: "tile"` for textures |
| `apps/web/src/v0/shell/V0ShellContext.tsx` | Add `coverImageMode` to `DomainDataTheme` |

**Cover image:** Set `domain.theme.coverImageMode = "tile"` in the domain theme JSON to tile a texture at natural size instead of scaling with `cover`.
