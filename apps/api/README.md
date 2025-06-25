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

### ✅ Final Solution: Standalone Docker Build
The current configuration uses a **standalone Docker deployment** that creates a flat application structure:

**How it works:**
1. **Build Stage**: Builds entire monorepo with all dependencies
2. **Production Stage**: Creates standalone app by copying built files to `/app/dist/` and workspace packages to `/app/node_modules/@keeper/`
3. **Dependencies**: Installs only production dependencies for the API
4. **Start**: Direct `node dist/index.js` execution

**Configuration Files:**
- `Dockerfile` - Multi-stage Docker build with standalone structure
- `railway.json` - Railway service configuration using Docker
- `railway-nixpacks.json` - Alternative Nixpacks configuration (backup)
- `railway-standalone.json` - Alternative standalone approach (backup)

### 🔧 Key Solutions Implemented

#### **Problem 1: Missing Compiled Files**
- **Issue**: `Cannot find module '/tmp/keeper-api/apps/api/dist/index.js'`
- **Solution**: Proper Docker multi-stage build that ensures compiled files exist

#### **Problem 2: ESM Module Resolution**
- **Issue**: `Cannot find package 'express'` - broken workspace symlinks
- **Solution**: Standalone structure with workspace packages copied as regular node_modules

#### **Problem 3: TypeScript Configuration**
- **Issue**: Module resolution conflicts between build and runtime
- **Solution**: Consistent ESM configuration with `moduleResolution: "Node"`

### 🏗️ Build Process
1. **Install Dependencies**: `pnpm install --frozen-lockfile`
2. **Build Packages**: `pnpm turbo build --filter=keeper-api...`
3. **Create Standalone**: Copy API dist to `/app/dist/`
4. **Copy Workspace Packages**: Copy `@keeper/*` packages to `/app/node_modules/@keeper/`
5. **Install Production Deps**: `pnpm install --prod --no-optional`
6. **Generate Prisma**: `npx prisma generate` in database package
7. **Start**: `node dist/index.js`

### 🎯 Start Commands
- **Production**: `node dist/index.js`
- **Development**: `node apps/api/dist/index.js`
- **Via npm**: `pnpm start:api`

## ⚠️ Notes & ToDo
- [x] Fixed missing compiled files issue
- [x] Fixed ESM module resolution in monorepo
- [x] Fixed TypeScript configuration conflicts
- [x] Created standalone deployment structure
- [ ] Verify all environment variables are configured in Railway
- [ ] Test database connectivity with Railway PostgreSQL
- [ ] Monitor deployment logs for any remaining issues

## 📆 Update Log
- **2025-01-24**: Created initial Railway deployment configuration
- **2025-01-24**: Fixed "Cannot find module" error with proper Docker build
- **2025-01-24**: Fixed "Cannot find package 'express'" with standalone structure
- **2025-01-24**: Implemented comprehensive TypeScript ESM configuration
- **2025-01-24**: Created multiple deployment approaches for redundancy
- **2025-01-24**: Final standalone Docker solution that resolves all monorepo issues 