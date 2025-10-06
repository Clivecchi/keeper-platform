# Auth

## 📌 Purpose
Authentication utilities for session validation, error handling, and token management.

## 🧱 Key Files
- `ensureSession.ts` - Validates stored tokens with server on app boot
- `handleAuthError.ts` - Centralized 401 error handler that clears auth and redirects to login

## 🔄 Data & Behavior
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
- [ ] Prevents "phantom login" where UI shows logged in but API rejects requests
- [ ] Ensures clean logout experience on auth failures
- [ ] Consider adding token refresh logic in future

## 📆 Update Log
**2025-10-06**: Created ensureSession.ts and handleAuthError.ts for hardened authentication flow

