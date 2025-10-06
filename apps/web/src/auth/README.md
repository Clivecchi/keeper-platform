# Auth

## 📌 Purpose
Authentication utilities for session validation, error handling, token management, and strict auth gating.

## 🧱 Key Files
- `AuthGate.tsx` - React component that validates auth before rendering app (PREVENTS PHANTOM LOGIN)
- `ensureSession.ts` - Validates stored tokens with server on app boot
- `handleAuthError.ts` - Centralized 401 error handler that clears auth and redirects to login

## 🔄 Data & Behavior

**AuthGate** (PRIMARY AUTH CONTROL):
- Wraps entire React app in main.tsx
- Shows "Loading..." until auth status is verified with server
- Makes blocking GET /api/domains/my request to validate token
- THREE STATES:
  - `checking`: Validating with server (shows loading screen)
  - `authed`: Valid token confirmed by server (renders app)
  - `guest`: No token or invalid token (renders app in guest mode)
- Clears invalid tokens automatically
- Prevents UI from showing "logged in" without server confirmation
- **Eliminates phantom login completely**

**ensureSession**:
- Called at app boot (in main.tsx) before rendering
- Checks for `keeper_token` in localStorage/sessionStorage
- Validates token with server via GET /api/domains/my
- Clears invalid tokens from storage
- Returns boolean indicating valid session

**handleAuthError**:
- Detects 401 errors from API responses or error objects
- Clears all auth data (keeper_token, keeper_user from both storages)
- Redirects to /login
- Used in BoardContext and BoardStudioPage error handlers

## ⚠️ Notes & ToDo
- [x] Prevents "phantom login" where UI shows logged in but API rejects requests
- [x] AuthGate provides strict server-verified auth state
- [x] Ensures clean logout experience on auth failures
- [ ] Consider adding token refresh logic in future
- [ ] Consider replacing ensureSession with AuthGate completely

## 📆 Update Log
**2025-10-06**: Created AuthGate.tsx for strict auth validation before render
**2025-10-06**: Created ensureSession.ts and handleAuthError.ts for hardened authentication flow

