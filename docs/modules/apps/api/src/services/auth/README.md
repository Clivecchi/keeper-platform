# Auth services

## 📌 Purpose
Account recovery for Keeper sign-in. Password reset uses the existing `users.resetPasswordToken` columns and Resend.

## 🧱 Key Files
- `passwordReset.ts` — token issue, safe return path, reset email

## 🔄 Data & Behavior
Forgot-password always answers the same way so an address cannot be probed. The emailed token is random; the database stores its SHA-256 hash for one hour. Reset sets a new password, clears the token, and signs the person in.

Invitation arrival links may be passed as `next` when that path stays on this site.

## ⚠️ Notes & ToDo
- [ ] Email verification is still unused (`emailVerified`)

## 📆 Update Log

### 2026-09-26 — Password reset
- Added forgot-password and reset-password so an invitation that created an account is not a dead end when the password does not match.
