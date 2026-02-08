# Web Context Providers

## 📌 Purpose
Encapsulate shared React context providers (auth, theme, boards, worlds, etc.) used by the Keeper web application shell and vertical experiences.

## 🧱 Key Files
- `AuthContext.tsx` – Loads/stores authenticated user session state.
- `ThemeContext.tsx` – Applies Keeper theme tokens and mode switching.
- `BoardContext.tsx` / `BoardDataContext.tsx` – Provide board-level data for Studio and dashboards.
- `FrameContext.tsx` – Supplies inline editing metadata per frame.
- `KeeperContext.tsx` – Keeper-specific data accessors.
- `ViewModeContext.tsx` and `WorldModeContext.tsx` – Toggle viewer/editor/world presentation modes.

## 🔄 Data & Behavior
- Contexts initialize on app boot via `App.tsx` (or route-level wrappers) and expose hooks (e.g., `useAuth`, `useTheme`).
- ThemeContext now skips `/api/kam/settings` when only cookie auth is available, relying on the built-in "Keeper Classic" fallback to avoid expected 401 noise.
- AuthContext stores bearer tokens in dev/localStorage but uses cookie-only markers (`'cookie-based'`) in production; downstream consumers must check for usable bearer tokens before calling Bearer-only APIs.
- Board-related contexts manage inline editing, data hydration, and debounced persistence for Studio/Domain dashboards.

## ⚠️ Notes & ToDo
- [ ] Add suspense boundaries around expensive context providers.
- [ ] Revisit KAM settings fetch once a cookie-auth endpoint is available.

## 📆 Update Log
### 2025-12-08 - ThemeContext Cookie-Aware Guard
- Skip `/api/kam/settings` calls when only cookie auth is present to prevent noisy 401s and rely on the Keeper Classic fallback until cookie-aware endpoints land.
### 2026-01-02 - Canonical Theme Vars
- Added canonical theme token mapping and emission as `--theme-*` CSS variables (surface/ink/border/shadow/focus), keeping legacy vars for compatibility.
### 2026-02-08 - Reliable Token-Based Auth
- `AuthContext.tsx` now stores the real JWT token from login responses even in production (via `authTokenStore`). Previously, the token was discarded in production with the assumption cookies would handle everything.
- `fetchUserSession` sends the stored JWT as `Authorization: Bearer` header alongside cookies, so the `/api/kam/auth/me` session check succeeds even when cookies are unavailable.
- `logout` now clears the auth token store.

### 2026-01-24 - Auth Resolution + Admin Allowlist
- Added resolved auth state and admin allowlist fallback to support stricter route guards.
