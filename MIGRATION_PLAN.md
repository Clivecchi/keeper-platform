# Keeper Platform - Monorepo Migration Plan

## 🎯 **Migration Overview**

This plan transforms your current structure into a clean, scalable monorepo while preserving all existing functionality and minimizing downtime.

**Current State:**
```
keeper-platform/
├── apps/web/           # ✅ Already exists
├── apps/api/           # ✅ Already exists  
├── src/                # ❌ Duplicate root structure
├── frontend/           # ❌ Old structure
├── backend/            # ❌ Old structure
├── packages/shared/    # ✅ Partially exists
└── [various configs]   # 🔄 Need updates
```

**Target State:**
```
keeper-platform/
├── apps/
│   ├── web/            # ✅ Clean Next.js app
│   └── api/            # ✅ Clean Express API
├── packages/
│   ├── kam/            # 🆕 Extracted from current structure
│   ├── shared/         # ✅ Enhanced utilities
│   └── database/       # 🆕 Prisma logic
├── tools/
│   ├── eslint-config/  # 🆕 Shared linting
│   └── tsconfig/       # 🆕 Base configs
└── [clean configs]     # ✅ Monorepo-ready
```

---

## 📋 **Phase 1: Preparation (Day 1)**

### Step 1.1: Backup and Branch
```bash
# Create migration branch
git checkout -b feature/monorepo-migration
git add -A
git commit -m "backup: pre-migration state"

# Create backup of current working state
cp -r . ../keeper-platform-backup
```

### Step 1.2: Install Required Tools
```bash
# Install Turborepo globally
npm install -g turbo

# Add missing dev dependencies
pnpm add -D turbo@latest
pnpm add -D @types/node typescript
```

### Step 1.3: Create New Directory Structure
```bash
# Create new package directories
mkdir -p packages/kam
mkdir -p packages/database
mkdir -p tools/eslint-config
mkdir -p tools/tsconfig

# Mark packages for workspace discovery
touch packages/kam/package.json
touch packages/database/package.json
touch tools/eslint-config/package.json
touch tools/tsconfig/package.json
```

---

## 📦 **Phase 2: Extract KAM Package (Day 1-2)**

### Step 2.1: Create KAM Package Structure
```bash
# Initialize KAM package
cd packages/kam
```

Create `packages/kam/package.json`:
```json
{
  "name": "@keeper/kam",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "jsonwebtoken": "^9.0.2",
    "zod": "^3.25.45"
  },
  "devDependencies": {
    "@types/bcryptjs": "^3.0.0",
    "@types/jsonwebtoken": "^9.0.9",
    "typescript": "~5.8.3"
  }
}
```

### Step 2.2: Move KAM Code
```bash
# Copy KAM from both locations, merging intelligently
mkdir -p packages/kam/src

# From apps/web/src/kam -> packages/kam/src
cp -r apps/web/src/kam/* packages/kam/src/
# From apps/api/src/kam -> packages/kam/src (merge)
cp -r apps/api/src/kam/* packages/kam/src/

# Create main export file
```

Create `packages/kam/src/index.ts`:
```typescript
// Main KAM exports - centralized access point
export * from './auth/index.js'
export * from './settings/index.js'
export * from './types/index.js'

// Re-export commonly used types
export type { KAMUser, AuthSession, LoginInput, RegisterInput } from './types/index.js'

// Re-export main functions
export {
  loginUserHandler,
  registerUserHandler,
  logoutUserHandler,
  getSessionHandler
} from './auth/index.js'

export {
  getSettingsHandler,
  updateSettingsHandler
} from './settings/index.js'
```

### Step 2.3: Create KAM TypeScript Config
Create `packages/kam/tsconfig.json`:
```json
{
  "extends": "../../tools/tsconfig/base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "baseUrl": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

---

## 🗄️ **Phase 3: Extract Database Package (Day 2)**

### Step 3.1: Create Database Package
Create `packages/database/package.json`:
```json
{
  "name": "@keeper/database",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "dev": "tsc -p tsconfig.json --watch",
    "generate": "prisma generate",
    "push": "prisma db push",
    "studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.7.0"
  },
  "devDependencies": {
    "prisma": "^6.9.0",
    "typescript": "~5.8.3"
  }
}
```

### Step 3.2: Move Prisma Files
```bash
# Move Prisma to database package
mv prisma packages/database/prisma

# Create database utilities
mkdir -p packages/database/src
```

Create `packages/database/src/index.ts`:
```typescript
// Database client and utilities
export { PrismaClient } from '@prisma/client'

// Create singleton instance
import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient()

if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prisma
}

// Re-export useful query helpers
export * from './queries/index.js'
export * from './types.js'
```

Create `packages/database/src/queries/index.ts`:
```typescript
// Common database queries
import { prisma } from '../index.js'

export async function getUserWithSettings(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { 
      userSettings: {
        include: {
          theme: true
        }
      }
    }
  })
}

export async function createUserWithDefaultSettings(userData: {
  email: string
  password: string
  name?: string
}) {
  return prisma.user.create({
    data: {
      ...userData,
      userSettings: {
        create: {
          theme: {
            connect: { name: 'Keeper Classic' }
          }
        }
      }
    },
    include: {
      userSettings: {
        include: { theme: true }
      }
    }
  })
}
```

---

## 🛠️ **Phase 4: Create Shared Tooling (Day 2)**

### Step 4.1: Base TypeScript Config
Create `tools/tsconfig/base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

Create `tools/tsconfig/node.json`:
```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2020"
  }
}
```

### Step 4.2: Shared ESLint Config
Create `tools/eslint-config/package.json`:
```json
{
  "name": "@keeper/eslint-config",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.30.1",
    "@typescript-eslint/parser": "^8.30.1",
    "eslint": "^9.25.0"
  }
}
```

Create `tools/eslint-config/index.js`:
```javascript
module.exports = {
  extends: [
    '@typescript-eslint/recommended',
    'eslint:recommended'
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    // Keeper-specific rules
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
}
```

---

## 🔧 **Phase 5: Update App Configurations (Day 3)**

### Step 5.1: Update Web App
Update `apps/web/package.json`:
```json
{
  "name": "keeper-web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.2",
    "framer-motion": "^12.16.0",
    "lucide-react": "^0.513.0",
    "tailwind-merge": "^3.3.1",
    "tailwindcss-animate": "^1.0.7",
    "@keeper/kam": "workspace:*",
    "@keeper/shared": "workspace:*",
    "@keeper/database": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^19.1.2",
    "@types/react-dom": "^19.1.2",
    "@vitejs/plugin-react": "^4.4.1",
    "vite": "^6.3.5",
    "typescript": "~5.8.3",
    "@keeper/eslint-config": "workspace:*"
  }
}
```

Update `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tools/tsconfig/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@keeper/kam": ["../../packages/kam/src/index.ts"],
      "@keeper/shared": ["../../packages/shared/src/index.ts"],
      "@keeper/database": ["../../packages/database/src/index.ts"]
    }
  },
  "include": ["src", "../index.html"],
  "exclude": ["node_modules", "dist"]
}
```

### Step 5.2: Update API App  
Update `apps/api/package.json`:
```json
{
  "name": "keeper-api",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js",
    "lint": "eslint .",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "dotenv": "^16.5.0",
    "@keeper/kam": "workspace:*",
    "@keeper/shared": "workspace:*",
    "@keeper/database": "workspace:*"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.19",
    "@types/node": "^22.15.30",
    "tsx": "^4.7.1",
    "typescript": "~5.8.3",
    "@keeper/eslint-config": "workspace:*"
  }
}
```

Update `apps/api/tsconfig.json`:
```json
{
  "extends": "../../tools/tsconfig/node.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@keeper/kam": ["../../packages/kam/src/index.ts"],
      "@keeper/shared": ["../../packages/shared/src/index.ts"],
      "@keeper/database": ["../../packages/database/src/index.ts"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## 🔄 **Phase 6: Update Imports and References (Day 3-4)**

### Step 6.1: Update Web App Imports
```bash
# Find and replace imports in web app
cd apps/web/src

# Replace KAM imports
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from ".*kam/|from "@keeper/kam/|g'
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from "\.\./kam/|from "@keeper/kam/|g'

# Replace shared imports  
find . -name "*.ts" -o -name "*.tsx" | xargs sed -i 's|from ".*shared/|from "@keeper/shared/|g'
```

### Step 6.2: Update API App Imports
```bash
# Find and replace imports in API app
cd apps/api/src

# Replace KAM imports
find . -name "*.ts" | xargs sed -i 's|from ".*kam/|from "@keeper/kam/|g'
find . -name "*.ts" | xargs sed -i 's|from "\.\./kam/|from "@keeper/kam/|g'

# Replace database imports
find . -name "*.ts" | xargs sed -i 's|from ".*prisma|from "@keeper/database"|g'
```

### Step 6.3: Remove Old KAM References
```bash
# After confirming imports work, remove old KAM directories
rm -rf apps/web/src/kam
rm -rf apps/api/src/kam
```

---

## 🏗️ **Phase 7: Configure Build System (Day 4)**

### Step 7.1: Create Turborepo Config
Create `turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "outputs": []
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    }
  }
}
```

### Step 7.2: Update Root Package.json
Update root `package.json`:
```json
{
  "name": "keeper-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*",
    "tools/*"
  ],
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "start": "turbo run start",
    "lint": "turbo run lint",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean",
    "db:generate": "pnpm --filter @keeper/database generate",
    "db:push": "pnpm --filter @keeper/database push",
    "db:studio": "pnpm --filter @keeper/database studio"
  },
  "devDependencies": {
    "turbo": "latest",
    "typescript": "~5.8.3",
    "concurrently": "^8.2.2"
  }
}
```

### Step 7.3: Update Workspace Config
Update `pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "tools/*"
```

---

## 🚀 **Phase 8: Fix Deployment Configs (Day 4)**

### Step 8.1: Update Vercel Config
Update `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm install && pnpm --filter apps/web... build",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install"
}
```

### Step 8.2: Update Railway Config
Update `railway.json`:
```json
{
  "build": {
    "env": {
      "NODE_ENV": "production"
    },
    "command": "pnpm install && pnpm --filter @keeper/database generate && pnpm --filter apps/api... build"
  },
  "start": {
    "command": "pnpm --filter apps/api start"
  }
}
```

### Step 8.3: Update Root TypeScript Config
Update `tsconfig.json`:
```json
{
  "files": [],
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/api" },
    { "path": "./packages/kam" },
    { "path": "./packages/shared" },
    { "path": "./packages/database" },
    { "path": "./tools/tsconfig" }
  ]
}
```

---

## 🧹 **Phase 9: Cleanup (Day 5)**

### Step 9.1: Remove Duplicate Directories
```bash
# Remove old duplicate structures
rm -rf frontend/
rm -rf backend/
rm -rf src/

# Remove old config files that are no longer needed
rm vite.config.ts       # Should be in apps/web/
rm index.html          # Should be in apps/web/
rm tsconfig.app.json   # Replaced by app-specific configs
rm tsconfig.node.json  # Replaced by tools/tsconfig/
```

### Step 9.2: Install Dependencies
```bash
# Install all workspace dependencies
pnpm install

# Generate Prisma client
pnpm db:generate
```

### Step 9.3: Test Everything
```bash
# Type check everything
pnpm type-check

# Build everything
pnpm build

# Test development servers
pnpm dev
```

---

## ✅ **Phase 10: Validation (Day 5)**

### Step 10.1: Verify Functionality
```bash
# Test KAM package imports
cd apps/web
node -e "console.log(require('@keeper/kam'))"

# Test database package
cd packages/database
pnpm generate
pnpm push
```

### Step 10.2: Test Deployments
```bash
# Test Vercel build locally
pnpm --filter apps/web build

# Test Railway build locally  
pnpm --filter apps/api build
```

### Step 10.3: Update Documentation
```bash
# Update main README to reference readme2.md structure
# Commit all changes
git add -A
git commit -m "feat: migrate to monorepo structure with apps/packages"
```

---

## 🚨 **Rollback Plan**

If issues arise during migration:

```bash
# Quick rollback to previous state
git checkout main
cp -r ../keeper-platform-backup/* .
pnpm install
```

---

## 📊 **Success Metrics**

After migration, you should see:

- ✅ **Faster builds**: 40-85% improvement with Turborepo caching
- ✅ **Clear imports**: `import { loginUser } from '@keeper/kam'`  
- ✅ **Working deployments**: Both Vercel and Railway building successfully
- ✅ **Type safety**: No TypeScript errors across workspace
- ✅ **KAM preserved**: All authentication logic intact and accessible
- ✅ **Future ready**: Space for Kip package when needed

---

## 🆘 **Troubleshooting Common Issues**

### Import Resolution Errors
```bash
# Clear all caches and reinstall
rm -rf node_modules packages/*/node_modules apps/*/node_modules
rm pnpm-lock.yaml
pnpm install
```

### TypeScript Path Issues
```bash
# Restart TypeScript in your editor
# Check that all tsconfig.json files have correct "paths" mapping
```

### Build Failures
```bash
# Check each package builds individually
pnpm --filter @keeper/kam build
pnpm --filter @keeper/shared build
pnpm --filter @keeper/database build
```

---

This migration plan preserves your KAM architecture, maintains working deployments, and sets you up for long-term success with the modern monorepo structure. The entire process should take 4-5 days with careful execution. 