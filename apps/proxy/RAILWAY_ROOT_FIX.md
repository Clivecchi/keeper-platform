# Railway Build Fix - Root Directory Configuration

## 🐛 Issue

Railway build is failing with:
```
Build Failed: build daemon returned an error < failed to solve: failed to read dockerfile: open apps/proxy/Dockerfile: no such file or directory >
```

**Root Cause:** Railway service is configured to use `apps/proxy` as the root directory, but:
1. Railway finds the Dockerfile at `apps/proxy/Dockerfile` but Docker can't access it because the build context is `apps/proxy`
2. The Dockerfile needs access to monorepo root files (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`)
3. Docker build context is limited to the root directory and below
4. Files outside the root directory are not accessible

## ✅ Solution

**Option 1: Change Railway Service Root Directory (RECOMMENDED)**

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

**Option 2: Use NIXPACKS (Current Implementation)**

The current setup uses NIXPACKS builder which should work even with `apps/proxy` as root:
1. `apps/proxy/railway.json` uses `"builder": "NIXPACKS"`
2. Build command: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter proxy build`
3. Start command: `cd apps/proxy && node dist/index.js`
4. `nixpacks.toml` provides additional configuration

**Note:** If NIXPACKS still fails, you MUST change Railway root directory to `.` (repo root)

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

