# Required Libraries & Dependencies Summary

## System Requirements

### ✅ Already Installed
- **Git**: Installed via GitHub Desktop
  - Location: `C:\Users\clive\AppData\Local\GitHubDesktop\app-3.5.4\resources\app\git\cmd`
  - Status: Working

### ❌ Missing - Must Install

#### 1. Node.js (CRITICAL)
- **Version**: 20.x LTS or 22.x (recommended)
- **Download**: https://nodejs.org/
- **Why**: Required to run JavaScript/TypeScript code
- **Size**: ~50MB installer
- **Installation**: Download .msi installer, run it, check "Add to PATH"

#### 2. pnpm (CRITICAL)
- **Version**: 10.11.0 (exact version required)
- **Installation**: `npm install -g pnpm@10.11.0` (after Node.js)
- **Why**: Package manager for this monorepo (required by package.json)

## Project Dependencies (Will be installed automatically)

### Frontend Dependencies (apps/web)
- **React** 19.1.0 - UI framework
- **Vite** 6.3.5 - Build tool
- **TypeScript** 5.8.3 - Type checking
- **Tailwind CSS** 4.1.10 - Styling
- **Radix UI** - Component library
- **React Router** 7.6.2 - Routing
- **Framer Motion** 12.16.0 - Animations

### Backend Dependencies (apps/api)
- **Express** 4.18.2 - Web framework
- **Prisma** 6.11.1 - Database ORM
- **TypeScript** 5.8.3 - Type checking
- **Zod** 3.25.45 - Schema validation
- **jsonwebtoken** 9.0.2 - Authentication
- **ioredis** 5.3.2 - Redis client
- **OpenAI** 4.75.1 - AI integration

### Shared Packages
- **@keeper/database** - Database utilities
- **@keeper/kam** - Authentication module
- **@keeper/shared** - Shared types

### Development Tools
- **Turbo** 2.5.4 - Monorepo build system
- **ESLint** 9.28.0 - Code linting
- **Vitest** 3.2.4 - Testing framework
- **TypeScript** 5.8.3 - Type checking

## Installation Order

1. **Install Node.js** (user action required)
   - Download from https://nodejs.org/
   - Install LTS version (20.x or 22.x)
   - Restart PowerShell

2. **Install pnpm** (automated via script)
   ```powershell
   npm install -g pnpm@10.11.0
   ```

3. **Install project dependencies** (automated via script)
   ```powershell
   cd "K:\Keeper Codebase\keeper-platform"
   pnpm install
   ```

## Quick Installation

Run the setup script:
```powershell
.\setup-dev-environment.ps1
```

This script will:
- ✅ Check for Node.js
- ✅ Install pnpm if needed
- ✅ Install all project dependencies
- ✅ Generate Prisma client
- ✅ Verify installation

## Estimated Installation Time

- Node.js installation: ~5 minutes
- pnpm installation: ~30 seconds
- Project dependencies: ~5-10 minutes (depends on internet speed)

## Total Disk Space Required

- Node.js: ~200MB
- pnpm cache: ~100MB
- Project dependencies: ~500MB-1GB
- **Total**: ~1-2GB

## Verification Commands

After installation, verify with:

```powershell
node --version    # Should show v20.x.x or v22.x.x
pnpm --version    # Should show 10.11.0
pnpm list --depth=0  # Should show installed packages
```


