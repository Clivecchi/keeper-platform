# Keeper API

## 📌 Purpose
Express.js API server that handles authentication, user settings, and core Keeper platform functionality. This is the backend service that powers the Keeper platform.

## 🧱 Key Files
- `src/index.ts` - Main Express server setup and route definitions
- `src/api/debug.ts` - Debug endpoints for development
- `src/api/kam/settings.ts` - User settings management endpoints
- `src/middleware/logRequestMiddleware.ts` - Request logging middleware
- `package.json` - Dependencies and build scripts
- `tsconfig.json` - TypeScript configuration

## 🔄 Data & Behavior
The API server uses:
- **Express.js** for HTTP server and routing
- **CORS** configured for cross-origin requests with credentials
- **@keeper/kam** for authentication handlers (login, register)
- **@keeper/shared** for logging utilities
- **@keeper/database** for Prisma database interactions
- **Environment Variables**: PORT (defaults to 3001), DATABASE_URL

### Routes:
- `GET /api/test` - Health check endpoint
- `POST /api/kam/auth/register` - User registration
- `POST /api/kam/auth/login` - User authentication
- `POST /api/kam/settings` - User settings management
- `/api/debug/*` - Debug endpoints (development)

## 🚀 Railway Deployment

### ✅ FINAL SOLUTION: Single-Stage Workspace Build
The current configuration uses a **single-stage Docker build** that maintains workspace structure throughout:

**Configuration Files:**
- `Dockerfile` - Single-stage build with workspace maintenance
- `railway.json` - Railway service configuration using Docker
- `railway-nixpacks.json` - Alternative Nixpacks configuration (backup)
- `railway-standalone.json` - Alternative standalone approach (backup)

### 🔧 Progressive Problem Resolution

#### **Problem 1: Missing Compiled Files** ✅ FIXED
- **Issue**: `Cannot find module '/tmp/keeper-api/apps/api/dist/index.js'`
- **Root Cause**: Railway's `pnpm deploy` doesn't copy compiled files
- **Solution**: Docker build that ensures compiled files exist

#### **Problem 2: Workspace Dependencies** ✅ FIXED  
- **Issue**: `"@keeper/kam@workspace:*" is in the dependencies but no package named "@keeper/kam" is present`
- **Root Cause**: Multi-stage Docker broke workspace structure
- **Solution**: Single-stage build that maintains workspace throughout

#### **Problem 3: ESM Module Resolution** ✅ FIXED
- **Issue**: `Cannot find package 'express'` - broken symlinks
- **Root Cause**: pnpm workspace symlinks broke during Docker copying
- **Solution**: Maintain workspace structure, don't copy individual files

#### **Problem 4: Missing Built Files** ✅ FIXED
- **Issue**: `Cannot find module '/app/packages/kam/dist/auth/register.js'`
- **Root Cause**: 
  - `.dockerignore` was excluding `dist` directories
  - Inconsistent TypeScript module resolution across packages
- **Solution**: 
  - Allow `dist` directories in Docker context
  - Standardized all TypeScript configs to use `moduleResolution: "Node"` and `module: "ESNext"`

### 🏗️ Build Process
1. **Copy Everything**: Copies entire workspace structure to Docker
2. **Install Dependencies**: `pnpm install --frozen-lockfile`
3. **Build All Packages**: `pnpm turbo build --filter=keeper-api...`
4. **Debug Verification**: Lists built files to ensure they exist
5. **Prune Dev Dependencies**: `pnpm prune --prod` (keeps workspace structure)
6. **Start Application**: `node apps/api/dist/index.js` from workspace root

### 🎯 Key Fixes Applied

#### **TypeScript Configuration Consistency**
All packages now use:
```json
{
  "module": "ESNext",
  "moduleResolution": "Node", 
  "target": "ES2022"
}
```

#### **Docker Optimization**
- Single-stage build (no complex multi-stage copying)
- Proper workspace structure maintenance
- Debug output to verify build success
- Selective `.dockerignore` (allows dist, excludes dev files)

#### **Railway Configuration**
- Direct Docker build approach
- Simple start command: `node apps/api/dist/index.js`
- Restart policies for reliability

### 🎯 Start Commands
- **Production**: `node apps/api/dist/index.js`
- **Development**: `node apps/api/dist/index.js`
- **Via npm**: `pnpm start:api`

## ⚠️ Notes & ToDo
- [x] Fixed missing compiled files issue
- [x] Fixed workspace dependency resolution
- [x] Fixed ESM module resolution in monorepo  
- [x] Fixed TypeScript configuration conflicts
- [x] Fixed missing built files during Docker build
- [x] Standardized module resolution across all packages
- [ ] Verify all environment variables are configured in Railway
- [ ] Test database connectivity with Railway PostgreSQL
- [ ] Monitor deployment for any remaining edge cases

## 📆 Update Log
- **2025-01-24**: Created initial Railway deployment configuration
- **2025-01-24**: Fixed "Cannot find module" error with Docker build
- **2025-01-24**: Fixed workspace dependency issues with single-stage build
- **2025-01-24**: Fixed ESM module resolution with workspace maintenance
- **2025-01-24**: Fixed missing built files with .dockerignore updates
- **2025-01-24**: Standardized TypeScript configurations across all packages
- **2025-01-24**: **FINAL CRITICAL FIX** - Fixed TypeScript import syntax for bcryptjs and jsonwebtoken that was preventing register.js compilation
- **2025-01-24**: COMPREHENSIVE SOLUTION - Single-stage Docker build with consistent TypeScript configs and proper imports 
- **2025-07-16**: Implemented secure authentication flow. Replaced static test login/register routes with database-driven implementations using bcryptjs for password hashing and jsonwebtoken for signing JWTs. Added Zod validation schemas (AuthLoginSchema, AuthRegisterSchema) for strict input validation. Updated auth middleware remains compatible. Now profile updates via PUT /api/users/:id succeed with valid tokens. 
 - **2025-08-29**: Added global Vitest setup `apps/api/vitest.setup.ts` to enforce safe test env. Defaulted `DISABLE_REDIS=true` to use internal no-op Redis in tests. Updated `vitest.config.ts` to include setup and exclude two non-suite demo files.
 - **2025-09-03**: Fixed TypeScript errors in `src/api/agents/topics.ts` by importing `PrismaClient` and resolving variable shadowing for `agentId`.