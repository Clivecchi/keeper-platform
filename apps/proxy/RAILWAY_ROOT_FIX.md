# Railway Build Fix - Root Directory Configuration

## 🐛 Issue

Railway build is failing with:
```
Build Failed: build daemon returned an error < failed to solve: failed to read dockerfile: open Dockerfile: no such file or directory >
```

**Root Cause:** Railway service is configured to use `apps/proxy` as the root directory, but:
1. The Dockerfile needs access to monorepo root files (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`)
2. Docker build context is limited to the root directory and below
3. Files outside the root directory are not accessible

## ✅ Solution

**Change Railway Service Root Directory:**

1. Go to Railway Dashboard
2. Select the proxy service
3. Go to **Settings** → **Service Settings**
4. Find **Root Directory** setting
5. Change from `apps/proxy` to `.` (repo root)
6. Save and redeploy

**Why This Works:**
- Railway will use the entire repo as the build context
- Dockerfile can access all monorepo files
- Build commands can use `pnpm --filter proxy` from repo root
- The Dockerfile in `apps/proxy/Dockerfile` will be found and used

## 📝 Alternative: Use NIXPACKS

If you prefer not to use Dockerfile, you can use NIXPACKS instead:

1. Keep `apps/proxy/railway.json` with `"builder": "NIXPACKS"`
2. Ensure Railway root directory is set to repo root (`.`)
3. NIXPACKS will automatically detect the monorepo structure

## 🔧 Current Configuration

- **Dockerfile Location:** `apps/proxy/Dockerfile`
- **Railway Root:** Should be `.` (repo root), currently set to `apps/proxy` ❌
- **Build Command:** Uses Dockerfile builder
- **Start Command:** `node dist/index.js`

## ✅ Verification

After changing the root directory:
1. Railway will find `apps/proxy/Dockerfile`
2. Build will have access to repo root files
3. `pnpm install --frozen-lockfile --filter proxy` will work
4. Build should succeed

