# Boot

## 📌 Purpose
Contains initialization code that must run before the main application starts, including the global fetch shim for cookie-only authentication enforcement.

## 🧱 Key Files
- `fetch-shim.ts` - Global fetch interceptor that enforces cookie-only auth in production and strips Authorization headers

## 🔄 Data & Behavior
The fetch shim:
- Installs a global `window.fetch` wrapper that runs before any network requests
- Detects API requests (relative `/api/` paths and absolute URLs to API domains)
- **PRODUCTION MODE**: Strips any `Authorization` headers from API requests, forces cookie-only auth
- **DEV MODE**: Injects `Authorization: Bearer <token>` from localStorage/sessionStorage if no header present
- Always sets `credentials: 'include'` to ensure cookies are sent
- Auto-cleans localStorage/sessionStorage tokens in PROD mode on load
- Supports all fetch input types: strings, URLs, and Request objects
- Includes verbose logging when `VITE_FETCH_SHIM_DEBUG=1` is set
- Prevents double-installation via `window.__keeper.fetchShimInstalled` flag

### Environment Variables
- `VITE_FETCH_SHIM_DEBUG` - Enable console logging
- `VITE_ALLOW_HEADER_AUTH` - Opt-in to allow header auth in production builds (for troubleshooting only)
- `VITE_API_URL` - API base URL for detection

## ⚠️ Notes & ToDo
- [x] Must be imported FIRST in main.tsx before any other imports
- [x] Enforces cookie-only authentication in production
- [ ] Remove this shim once all code migrates to using apiFetch helper
- [ ] Currently catches both apiFetch and raw fetch calls for safety

## 📆 Update Log
**2025-10-11**: Enforced cookie-only auth for web browsers - strips Authorization headers in PROD, added VITE_ALLOW_HEADER_AUTH flag, auto-cleanup of dev tokens

**2025-10-06**: Created fetch-shim.ts with comprehensive fetch interception and auth injection
