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
This application is configured for Railway deployment with a monorepo setup:

### Configuration Files:
- `Dockerfile` - Multi-stage Docker build for production deployment
- `railway.json` - Railway service configuration using Docker
- `railway-nixpacks.json` - Alternative Nixpacks configuration (backup)

### Build Process:
1. **Build Stage**: Installs dependencies and builds all packages using Turbo
2. **Production Stage**: Copies built artifacts and runtime dependencies
3. **Start Command**: `pnpm start:api` or `node apps/api/dist/index.js`

### Key Features:
- **Monorepo Support**: Properly handles workspace dependencies
- **Prisma Integration**: Generates Prisma client during build
- **TypeScript Compilation**: Compiles to `dist/index.js`
- **Production Optimization**: Multi-stage Docker build for smaller image

## ⚠️ Notes & ToDo
- [ ] Environment variables must be configured in Railway dashboard
- [ ] DATABASE_URL must point to Railway PostgreSQL instance
- [ ] PORT is automatically set by Railway
- [ ] Verify all workspace package dependencies are properly built and included

## 📆 Update Log
- **2025-01-24**: Created Railway deployment configuration with Docker and Nixpacks options
- **2025-01-24**: Fixed monorepo build issues by ensuring compiled files are copied to production image
- **2025-01-24**: Added comprehensive error handling and restart policies for Railway deployment 