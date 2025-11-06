# Deployment Status & Action Items

## 🔴 Critical Issues Found

### 1. Manifesto Frame Not Visible ❌
**Problem:** The Clean Surface Doctrine frame is missing from `/d/kip`

**Root Cause:** Database hasn't been seeded with the new frame data

**Fix Required:**
```bash
cd packages/database
pnpm tsx prisma/scripts/add-manifesto-frame.ts
```

**Status:** Frontend code is ready ✅ | Database needs update ❌

---

### 2. Login Page Layout Fixed ✅
**Problem:** Login page was showing old centered card with motion animation

**Root Cause:** LoginPage component had its own layout wrappers

**Fix Applied:** Just updated LoginPage.tsx to use minimal board-first layout

**Status:** FIXED - Deploy frontend to see changes

---

### 3. Auth Controls Position ⚠️ NEEDS VERIFICATION
**Problem:** User reports "Sign in buttons still not rightly oriented"

**Current Implementation:** Auth controls should be in absolute overlay (top-right inside board)

**Need to verify:** After manifesto frame is added, check if controls are positioned correctly

---

## ✅ What IS Working

| Feature | Status | File |
|---------|--------|------|
| ManifestoCard component | ✅ Created | `components/patterns/ManifestoCard.tsx` |
| PropRenderer handles "manifesto" | ✅ Updated | `components/domain/PropRenderer.tsx` |
| Manifesto full page | ✅ Created | `pages/manifestos/CleanSurfaceDoctrinePage.tsx` |
| Route for /manifestos/... | ✅ Added | `App.tsx` |
| Login route under BoardPublicLayout | ✅ Updated | `App.tsx` |
| Login page minimal layout | ✅ JUST FIXED | `LoginPage.tsx` |
| Admin frame visibility filter | ✅ Implemented | `DomainBoardRenderer.tsx` |
| "View Domain Board" in navbar | ✅ Added | `Navbar.tsx` |
| Seed file updated | ✅ Updated | `design-boards.seed.ts` |
| Standalone seed script | ✅ Created | `scripts/add-manifesto-frame.ts` |

---

## 🔧 Required Actions (In Order)

### Step 1: Run Database Seed Script
```bash
cd packages/database
pnpm tsx prisma/scripts/add-manifesto-frame.ts
```

**Expected Output:**
```
📝 Adding Manifesto Frame to Domain Boards...
Found X domain board(s)
  ➕ Adding manifesto frame to "Domain Design Board"...
  ✅ Manifesto frame added to "Domain Design Board"
✅ Manifesto frames added successfully!
```

### Step 2: Restart Backend
Your backend might be caching board data. Restart it:
```bash
# In your backend directory
pnpm dev
# or
npm restart
```

### Step 3: Deploy Frontend Changes
The LoginPage fix needs to be deployed:
```bash
cd apps/web
pnpm build
# Deploy to Vercel/Railway
```

### Step 4: Clear Browser Cache
Hard refresh the page:
- **Chrome/Edge:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- **Firefox:** Ctrl+F5 (Windows) or Cmd+Shift+R (Mac)

### Step 5: Verify

**Test Login Page (`/login`):**
- ✅ No top navbar
- ✅ Full-screen gradient background
- ✅ Centered white card with login form
- ✅ "Back to Home" link at bottom

**Test Public Domain (`/d/kip`):**
- ✅ Cover frame with "KE3P" title
- ✅ **NEW: Manifesto card below cover**
  - Title: "The Clean Surface Doctrine"
  - Kicker: "Keeper Design Manifesto"
  - Quote in italics
  - Content paragraphs
  - "Read Full Doctrine" button
- ✅ Auth controls in top-right overlay
- ✅ Minimal footer at bottom

**Test Full Manifesto (`/manifestos/clean-surface-doctrine`):**
- ✅ Clean article layout
- ✅ All seven laws
- ✅ "Back to Home" navigation

---

## 🐛 Known Issues NOT In Scope

These are issues you mentioned but were not part of the recent work:

1. **"Cant change slug for domain"** - Domain editing functionality (not implemented)
2. **"Cant upload domain cover"** - Cover upload (not implemented)
3. **Other admin features** - Various domain management features (not implemented)

---

## 📊 Why The Difference in Expectations

### What I Claimed vs What You See

| Claim | Reality | Why Different |
|-------|---------|---------------|
| "Manifesto frame added" | Not visible | Seed script not run ❌ |
| "Login uses minimal layout" | Still old layout | Component wrapper issue (JUST FIXED) ✅ |
| "Auth controls in overlay" | Need verification | Frontend deployed but may need checking ⚠️ |
| "Admin frame filtering" | Should work | Frontend ready, backend may need seed ✅ |

### The Core Problem

I was making **frontend code changes** and updating **seed files**, but:
1. **Seed files don't auto-run** - you must manually execute them
2. **Frontend changes** need to be built and deployed
3. **I didn't verify** what was actually running in your environment

---

## 🎯 Next Immediate Actions

### Priority 1: Add Manifesto Frame
```bash
cd packages/database
pnpm tsx prisma/scripts/add-manifesto-frame.ts
```

### Priority 2: Deploy Frontend
```bash
cd apps/web
pnpm build
# Then deploy
```

### Priority 3: Verify
1. Visit `/login` - should see minimal layout
2. Visit `/d/kip` - should see manifesto frame
3. Click "Read Full Doctrine" - should navigate to full page

---

## 📞 If Still Not Working

### Debug Checklist

1. **Check backend logs** - Are frames being returned?
   ```bash
   curl https://your-api.com/api/domains/by-slug/kip
   ```

2. **Check browser console** - Any errors?
   - Open DevTools (F12)
   - Look for red errors

3. **Check network tab** - Is board-data endpoint working?
   - Look for `/api/domains/:id/board-data`
   - Verify response contains manifesto frame

4. **Verify database** - Did seed script actually run?
   ```bash
   cd packages/database
   pnpm prisma studio
   ```
   - Open "FrameInstance" table
   - Search for "The Clean Surface Doctrine"

---

## ✅ Quick Verification Commands

```bash
# 1. Check if manifesto frame exists in database
cd packages/database
pnpm prisma studio
# Look for "The Clean Surface Doctrine" in FrameInstance table

# 2. Check if frontend files exist
ls apps/web/src/components/patterns/ManifestoCard.tsx
ls apps/web/src/pages/manifestos/CleanSurfaceDoctrinePage.tsx

# 3. Test manifesto page directly
# Visit: http://localhost:3000/manifestos/clean-surface-doctrine

# 4. Check API response
curl http://your-backend/api/domains/:id/board-data | jq '.board.frames[] | select(.name=="The Clean Surface Doctrine")'
```

---

## 📝 Summary

**What's Actually Working:**
- ✅ Frontend components created
- ✅ Routing configured
- ✅ Prop rendering set up
- ✅ Seed file updated
- ✅ LoginPage just fixed

**What Needs Action:**
- ❌ Run database seed script
- ❌ Deploy frontend changes
- ❌ Restart backend
- ❌ Clear browser cache

**Expected Time to Fix:** 5-10 minutes once you run the seed script and deploy

---

Let me know which step you're stuck on and I'll help debug further.

