# Boot

## 📌 Purpose
Contains initialization code that must run before the main application starts, including the global fetch shim for authentication.

## 🧱 Key Files
- `fetch-shim.ts` - Global fetch interceptor that injects Authorization headers for all API requests

## 🔄 Data & Behavior
The fetch shim:
- Installs a global `window.fetch` wrapper that runs before any network requests
- Detects API requests (relative `/api/` paths and absolute URLs to API domains)
- Automatically injects `Authorization: Bearer <token>` headers from localStorage/sessionStorage
- Supports all fetch input types: strings, URLs, and Request objects
- Includes verbose logging when `VITE_FETCH_SHIM_DEBUG=1` is set
- Prevents double-installation via `window.__keeper.fetchShimInstalled` flag

## ⚠️ Notes & ToDo
- [ ] Must be imported FIRST in main.tsx before any other imports
- [ ] Remove this shim once all code migrates to using apiFetch helper
- [ ] Currently catches both apiFetch and raw fetch calls for safety

## 📆 Update Log
**2025-10-06**: Created fetch-shim.ts with comprehensive fetch interception and auth injection

