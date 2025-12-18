# Development Environment Setup Guide

## Required Software

### 1. Node.js (Required)
- **Version**: Node.js 20.x or 22.x (LTS recommended)
- **Download**: https://nodejs.org/
- **Why**: Required to run JavaScript/TypeScript code
- **Check**: `node --version` should show v20.x.x or v22.x.x

### 2. pnpm (Required)
- **Version**: pnpm@10.11.0 (exact version specified in package.json)
- **Installation**: After Node.js is installed, run: `npm install -g pnpm@10.11.0`
- **Why**: Package manager for this monorepo (required, not optional)
- **Check**: `pnpm --version` should show 10.11.0

### 3. PostgreSQL (Optional for local dev)
- **Note**: Database is typically hosted on Railway in production
- **Local**: Only needed if running database locally
- **Download**: https://www.postgresql.org/download/

### 4. Git (Already Installed ✅)
- **Status**: Already configured via GitHub Desktop
- **Location**: `C:\Users\clive\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd`

## Installation Steps

### Step 1: Install Node.js

1. **Download Node.js LTS** (v20.x or v22.x):
   - Visit: https://nodejs.org/
   - Download the Windows Installer (.msi)
   - Run the installer
   - **Important**: Check "Add to PATH" during installation

2. **Verify Installation**:
   ```powershell
   node --version
   npm --version
   ```
   Should show versions like `v20.x.x` and `10.x.x`

### Step 2: Install pnpm

After Node.js is installed, open a **new PowerShell window** and run:

```powershell
npm install -g pnpm@10.11.0
```

**Verify**:
```powershell
pnpm --version
```
Should show: `10.11.0`

### Step 3: Install Project Dependencies

Navigate to the project directory and install:

```powershell
cd "K:\Keeper Codebase\keeper-platform"
pnpm install
```

This will:
- Install all dependencies for all workspaces (apps/*, packages/*, tools/*)
- Generate Prisma client (runs automatically via postinstall)
- Set up the monorepo structure

### Step 4: Verify Installation

```powershell
# Check Node.js
node --version

# Check pnpm
pnpm --version

# Check dependencies
pnpm list --depth=0

# Run type check
pnpm type-check
```

## Project Structure

This is a **monorepo** using pnpm workspaces:

- **apps/web**: React frontend (Vite + TypeScript)
- **apps/api**: Express backend (TypeScript)
- **packages/database**: Prisma schema and database utilities
- **packages/kam**: Keeper Access Module (auth)
- **packages/shared**: Shared types and utilities

## Key Dependencies Summary

### Frontend (apps/web)
- React 19.1.0
- Vite 6.3.5
- TypeScript 5.8.3
- Tailwind CSS 4.1.10
- Radix UI components
- React Router 7.6.2
- Framer Motion 12.16.0

### Backend (apps/api)
- Express 4.18.2
- Prisma 6.11.1
- TypeScript 5.8.3
- Zod 3.25.45
- JWT authentication
- Redis (ioredis 5.3.2)
- OpenAI SDK 4.75.1

### Development Tools
- Turbo 2.5.4 (monorepo build system)
- ESLint 9.28.0
- TypeScript 5.8.3
- Vitest 3.2.4 (testing)

## Common Commands

```powershell
# Install dependencies
pnpm install

# Run development servers
pnpm dev

# Build all packages
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint

# Database commands
pnpm db:generate    # Generate Prisma client
pnpm db:push        # Push schema changes
pnpm db:studio      # Open Prisma Studio
```

## Troubleshooting

### Node.js not found
- Restart PowerShell after installing Node.js
- Check PATH: `$env:Path -split ';' | Select-String node`

### pnpm not found
- Make sure Node.js is installed first
- Run: `npm install -g pnpm@10.11.0`
- Restart PowerShell

### Installation fails
- Clear cache: `pnpm store prune`
- Delete `node_modules` and `pnpm-lock.yaml`
- Run: `pnpm install` again

### Prisma errors
- Run: `pnpm db:generate`
- Check database connection in `.env` file

## Next Steps After Installation

1. Copy `.env.example` to `.env`
2. Configure environment variables (DATABASE_URL, JWT_SECRET, etc.)
3. Run `pnpm db:generate` to generate Prisma client
4. Run `pnpm dev` to start development servers














