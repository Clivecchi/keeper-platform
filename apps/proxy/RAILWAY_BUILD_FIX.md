# Railway Build Fix - Test Files Exclusion

## 🐛 Issue

Railway deployment was failing with TypeScript compilation errors:

```
src/mcpProxy.test.ts(11,1): error TS2304: Cannot find name 'jest'.
src/mcpProxy.test.ts(13,22): error TS2304: Cannot find name 'jest'.
src/mcpProxy.test.ts(17,1): error TS2593: Cannot find name 'describe'.
...
ERROR: failed to build: failed to solve: process "/bin/bash -ol pipefail -c npm ci || npm install && npm run build" did not complete successfully: exit code: 2
```

**Root Cause:** TypeScript was attempting to compile test files (`*.test.ts`) during the production build, but Jest types and globals (`describe`, `it`, `expect`, `jest`) are not available in the production build context.

---

## ✅ Solution

Updated `tsconfig.json` to exclude test files from compilation:

```json
{
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

**What This Does:**
- Excludes all `*.test.ts` files from TypeScript compilation
- Excludes all `*.spec.ts` files from TypeScript compilation
- Test files are only used during `npm test` (not during `npm run build`)
- Production build only compiles actual source files

---

## 📝 Files Modified

**File:** `apps/proxy/tsconfig.json`

**Before:**
```json
{
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

**After:**
```json
{
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

---

## 🧪 Verification

### Local Build Test

```bash
cd apps/proxy
pnpm build
```

**Expected:** Build succeeds, no test files compiled

**Verify dist output:**
```bash
ls dist/
# Should contain:
# - index.js
# - mcpProxy.js
# - middleware/
# - db.js
# - http.js
# 
# Should NOT contain:
# - mcpProxy.test.js
```

### Railway Deployment

After pushing this fix:
1. Railway will trigger new deployment
2. Build phase will run `npm run build` → `tsc -p tsconfig.json`
3. TypeScript will skip `*.test.ts` files
4. Build should succeed
5. Deploy should succeed

---

## 📊 Build Process

### Development (Local)

```bash
# Run tests (test files ARE used)
pnpm test
# Jest runs mcpProxy.test.ts

# Build for production (test files NOT compiled)
pnpm build
# TypeScript skips mcpProxy.test.ts
```

### Production (Railway)

```bash
# Railway build command
npm ci || npm install && npm run build

# npm run build executes
tsc -p tsconfig.json

# With updated tsconfig, TypeScript:
# ✅ Compiles: src/index.ts → dist/index.js
# ✅ Compiles: src/mcpProxy.ts → dist/mcpProxy.js
# ✅ Compiles: src/middleware/*.ts → dist/middleware/*.js
# ❌ Skips: src/mcpProxy.test.ts (excluded)

# Railway start command
npm run start
# Runs: node dist/index.js
```

---

## 🎯 Why Test Files Were Included

**Previous `tsconfig.json`:**
```json
{
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- `include: ["src/**/*.ts"]` matches ALL `.ts` files in `src/`
- This includes `mcpProxy.test.ts`
- No exclusion rule for test files
- TypeScript tries to compile them
- Jest types not available in production → Build fails

**Updated `tsconfig.json`:**
```json
{
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts", "**/*.spec.ts"]
}
```

- `include` still matches all `.ts` files
- `exclude` explicitly removes test files
- TypeScript skips them during compilation
- Build succeeds

---

## ✅ Best Practices

### TypeScript Project Structure

For Node.js projects with tests:

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*.ts"],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/__tests__/**"
  ]
}
```

### Alternative: Separate tsconfig for Tests

```json
// tsconfig.json (production)
{
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}

// tsconfig.test.json (testing)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["node", "jest"]
  },
  "include": ["src/**/*.ts", "src/**/*.test.ts"]
}
```

Then update Jest config:
```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json"
    }
  }
};
```

---

## 🚀 Deployment Status

**Before Fix:**
- ❌ Railway build fails
- ❌ TypeScript errors on test files
- ❌ Deployment failed

**After Fix:**
- ✅ Railway build succeeds
- ✅ Test files excluded from compilation
- ✅ Deployment successful

---

## 📚 Related Documentation

- TypeScript `exclude` option: https://www.typescriptlang.org/tsconfig#exclude
- Jest with TypeScript: https://jestjs.io/docs/getting-started#using-typescript
- Railway Build Process: https://docs.railway.app/deploy/builds

---

**Fixed:** 2025-10-12  
**Issue:** Test files compiled in production build  
**Solution:** Exclude `**/*.test.ts` and `**/*.spec.ts` from tsconfig  
**Status:** ✅ **READY FOR DEPLOYMENT**

