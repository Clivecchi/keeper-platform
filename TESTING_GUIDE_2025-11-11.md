# Testing Guide - Dashboard & Edit Mode Fixes

## 🚀 Deployment Status

**Commit:** `416e57d6` - Pushed to `Agent-Home-Board` branch  
**Status:** Vercel should be building now (check https://vercel.com dashboard)

## ⏳ Wait for Deployment

1. Go to your Vercel dashboard
2. Wait for the build to complete (usually 2-3 minutes)
3. Look for the success message
4. Clear your browser cache (Ctrl+Shift+R) after deployment completes

## 🔍 Finding Your Domain Slug

Your domain board is accessed at `https://ke3p.com/d/{slug}` 

To find your actual domain slug, try one of these:

### Option 1: Check the Database/Admin
1. Sign in to https://ke3p.com/root
2. Look for "Domain" or domain settings
3. Note the slug value

### Option 2: Check Console Logs
1. Open browser console (F12)
2. Navigate around the app while logged in
3. Look for API calls to `/api/domains/`
4. The slug will be in the URL

### Option 3: Common Slugs to Try
- https://ke3p.com/d/ke3p
- https://ke3p.com/d/keeper
- https://ke3p.com/d/{your-username}

## ✅ Testing Checklist

### Test 1: Authentication Persistence
1. Navigate to https://ke3p.com/login
2. Sign in with your credentials
3. Open Console (F12) - should see:
   ```
   [AuthContext] Production mode: fetching user from server
   [AuthContext] User authenticated: {user data}
   ```
4. Navigate to https://ke3p.com/root
5. **Expected:** Should load Root Dashboard WITHOUT asking to login again
6. **If it asks to login:** The auth fix didn't deploy yet (wait for Vercel)

### Test 2: Dashboard Link from Domain Board
1. Navigate to your domain board: https://ke3p.com/d/{YOUR-SLUG}
2. Look for user menu in top-right corner
3. Click on your name/avatar
4. Click "Dashboard" in the dropdown
5. **Expected:** Should navigate to `/root` WITHOUT re-login
6. **If it redirects to login:** Check console for auth errors

### Test 3: Edit Button Visibility (Domain Admins Only)
1. Navigate to your domain board while logged in as the domain owner
2. **Expected:** See an "Edit" button next to the user menu (top-right)
3. **If no Edit button:** Check console for:
   ```
   [PublicDomainPage] User permissions: {role, canEdit, isDomainAdmin}
   ```
4. Verify `isDomainAdmin: true` in the console
5. If `isDomainAdmin: false`, check your role in the database

### Test 4: Edit Mode Functionality
1. Click the "Edit" button (if visible)
2. **Expected:** 
   - Blue banner appears: "Editing Mode - Click on any element to edit"
   - "Save Changes" and "Cancel" buttons appear
   - Frames show edit controls
3. **Expected:** See ALL frames (both public and admin)
4. Check console:
   ```
   [DomainBoardRenderer] Frame visibility: {
     totalFrames: X,
     visibleFrames: Y,
     isDomainAdmin: true,
     framesByVisibility: {public: A, admin: B}
   }
   ```

### Test 5: Public View (Non-Admins)
1. Sign out or use incognito mode
2. Navigate to the domain board
3. **Expected:**
   - NO "Edit" button visible
   - Only PUBLIC frames visible (admin frames hidden)
   - "Sign In" and "Get Started" buttons visible

## 🐛 Troubleshooting

### Issue: "Dashboard link doesn't work"

**Symptoms:** Clicking Dashboard redirects to login

**Check:**
1. Open Console (F12)
2. Look for: `[AuthContext] User authenticated:`
3. If you see `401` errors for `/api/kam/auth/me`, the new build hasn't deployed yet

**Solution:** Wait for Vercel deployment, then hard refresh (Ctrl+Shift+R)

### Issue: "No Edit button appears"

**Symptoms:** Logged in but can't see Edit button

**Check:**
1. Console log: `[PublicDomainPage] User permissions:`
2. Verify `isDomainAdmin: true`
3. If `false`, check your role in the database

**Solution:** You must be the domain owner or have admin role

### Issue: "Still seeing old behavior"

**Symptoms:** None of the fixes seem to work

**Check:**
1. Inspect the page source
2. Look for the script tag with hash: `index-{hash}.js`
3. Compare to the build output (should match the new hash)

**Solution:** 
- Clear all browser cache and cookies
- Try incognito mode
- Check Vercel dashboard to ensure deployment succeeded

## 📊 Expected Console Output (After Fix)

When everything is working, you should see:

```
[Keeper] Diagnostics loaded...
[Keeper] API base = https://api.ke3p.com
[AuthContext] Production mode: fetching user from server
[AuthContext] User authenticated: {id: "...", email: "...", name: "..."}
[App] Component rendered in environment: production
[SystemStatus] health ok
[PublicDomainPage] User permissions: {user: "...", role: "owner", canEdit: true, isDomainAdmin: true, totalFrames: 5}
[DomainBoardRenderer] Frame visibility: {totalFrames: 5, visibleFrames: 5, isDomainAdmin: true, ...}
```

## ⚠️ Known Issues

1. **Turbo Build Fails:** Use `cd apps/web && pnpm build` instead
2. **Domain Not Found:** Check the slug - it must match exactly
3. **401 Errors:** Means old build is still deployed - wait for Vercel

## 🎯 Quick Reference

| URL | Purpose | Auth Required |
|-----|---------|---------------|
| `https://ke3p.com` | Landing page | No |
| `https://ke3p.com/login` | Sign in | No |
| `https://ke3p.com/root` | Admin dashboard | Yes |
| `https://ke3p.com/d/{slug}` | Domain board | Hybrid (works for both) |
| `https://ke3p.com/studio` | Board studio | Yes |

---

**Last Updated:** November 11, 2025  
**Deployment Commit:** 416e57d6  
**Branch:** Agent-Home-Board

