# Keeper Platform - Monorepo Development Guide

A poetic digital space where people preserve what matters. This is the beginning of a life-centered UI built with modern monorepo architecture.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development servers (all apps)
pnpm dev

# Build entire platform
pnpm build

# Run specific app
pnpm --filter apps/web dev
pnpm --filter apps/api dev
```

---

## 🏗️ Project Structure

```
keeper-platform/
├── apps/
│   ├── web/              # Next.js/React frontend (Vercel)
│   └── api/              # Express.js backend (Railway)
├── packages/
│   ├── kam/              # Keeper Access Management (auth & user logic)
│   ├── shared/           # Shared utilities, types, and configurations
│   └── database/         # Prisma schema, queries, and database utilities
├── tools/
│   ├── eslint-config/    # Shared ESLint configurations
│   └── tsconfig/         # Base TypeScript configurations
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── MODEL_REFERENCE.MD # Database documentation
├── turbo.json            # Build pipeline configuration
├── pnpm-workspace.yaml   # Workspace configuration
└── vercel.json          # Vercel deployment config
```

### 🎯 Architecture Principles

- **`apps/`** = Things that can be DEPLOYED (web apps, APIs, services)
- **`packages/`** = Things that can be IMPORTED (libraries, utilities, business logic)
- **Domain-Driven**: KAM and Kip are first-class architectural concepts
- **Type-Safe**: Strict TypeScript throughout with Zod validation
- **Monorepo**: Shared code, unified tooling, optimized builds

---

## 🧩 Core Packages

### 📦 KAM (Keeper Access Management)

**Location**: `packages/kam/`

KAM is the centralized system for all user-related functionality:

```typescript
// Import KAM functionality anywhere in the platform
import { authenticateUser, getUserSettings } from '@keeper/kam'
import { KAMUser, AuthSession } from '@keeper/kam/types'
```

**Responsibilities:**
- Authentication (sign-up, sign-in, sign-out)
- Authorization (session management, access control)
- User Management (profiles, settings, preferences)
- Theme Management (automatic Keeper Classic theme assignment)

### 🤖 Kip (Keeper Interface Protocol)

**Location**: `packages/kip/` *(Future)*

Kip will be the AI interface layer supporting platform growth:

```typescript
// Future Kip integration
import { processKeepRequest, generateSuggestions } from '@keeper/kip'
import { KipInterface, MemoryProtocol } from '@keeper/kip/types'
```

### 🗄️ Database Package

**Location**: `packages/database/`

Centralized database logic built with Prisma:

```typescript
import { prisma, getUserWithSettings } from '@keeper/database'
```

---

## 🛠️ Development Standards

### 📝 File Conventions

| Type | Extension | Purpose | Context |
|------|-----------|---------|---------|
| Frontend UI | `.tsx` | React Components | `apps/web` |
| Backend API | `.ts` | Express Logic | `apps/api` |
| Shared Logic | `.ts` | Business Logic | `packages/*` |
| Shared Types | `.ts` | Type Definitions | `packages/*` |

### 🔗 Import Patterns

```typescript
// ✅ Import from packages (preferred)
import { authenticateUser } from '@keeper/kam'
import { logger, validateInput } from '@keeper/shared'

// ✅ Import within app
import { UserProfile } from '../components/UserProfile'

// ✅ Relative imports (use .js suffix for Node.js)
import { handler } from './auth.js'
```

### 🪝 API Route Handling

All API routes use Express-style handlers:

```typescript
async function handler(req: Request, res: Response) {
  try {
    // Use KAM for authentication
    const user = await authenticateUser(req.headers.authorization)
    
    // Business logic here
    const result = await processRequest(user, req.body)
    
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
}
```

---

## ⚙️ Scripts & Build System

### 🎯 Root Scripts (Turborepo)

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build", 
    "start": "turbo run start",
    "lint": "turbo run lint",
    "clean": "turbo run clean",
    "type-check": "turbo run type-check"
  }
}
```

### 📱 App-Specific Scripts

**Frontend (`apps/web`)**:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

**Backend (`apps/api`)**:
```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/index.js"
  }
}
```

### ⚡ Turborepo Pipeline

```json
{
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
    }
  }
}
```

---

## 🏗️ TypeScript Configuration

### 📁 Root Configuration

```json
// tsconfig.json (project references)
{
  "files": [],
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/api" },
    { "path": "./packages/kam" },
    { "path": "./packages/shared" },
    { "path": "./packages/database" }
  ]
}
```

### 🖥️ Backend Config (`apps/api`)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "moduleResolution": "NodeNext",
    "module": "NodeNext",
    "target": "ES2020",
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["**/*.tsx"]
}
```

### 🌐 Frontend Config (`apps/web`)

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "module": "ESNext",
    "target": "ES2020",
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src", "index.html"]
}
```

---

## 🚀 Deployment

### 🔷 Vercel (Frontend)

```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm --filter apps/web... build",
  "outputDirectory": "apps/web/dist"
}
```

**Environment Variables:**
- `VITE_API_URL`: Backend API endpoint
- `VITE_VERCEL_URL`: Frontend URL for callbacks

### 🚂 Railway (Backend)

```json
// railway.json
{
  "build": {
    "env": {
      "NODE_ENV": "production"
    },
    "command": "pnpm install && pnpm --filter apps/api... build"
  },
  "start": {
    "command": "pnpm --filter apps/api start"
  }
}
```

**Environment Variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Authentication token secret
- `PORT`: Server port (provided by Railway)

---

## 🗃️ Database & Prisma

### 📊 Schema Management

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes to database
pnpm db:push

# Pull schema from database
pnpm db:pull

# Open Prisma Studio
pnpm db:studio
```

### 🏷️ Key Models

- **User**: Core system account object
- **UserSettings**: Theme + system preferences  
- **Theme**: Visual theming configurations
- **KeeperMapping**: Memory and journey relationships
- **MediaContent**: File and media management

*See `prisma/MODEL_REFERENCE.MD` for complete documentation*

---

## 🔐 Authentication Flow (KAM)

### 🔑 User Registration

```typescript
import { registerUser } from '@keeper/kam'

const newUser = await registerUser({
  email: 'user@example.com',
  password: 'securepassword',
  name: 'John Keeper'
})

// Auto-assigns Keeper Classic theme
// Creates UserSettings record
// Returns user object with session
```

### 🚪 Authentication

```typescript
import { authenticateUser, createSession } from '@keeper/kam'

// Login flow
const user = await authenticateUser(email, password)
const session = await createSession(user.id)

// Session verification
const currentUser = await verifySession(sessionToken)
```

### 🎨 Theme Management

```typescript
import { getUserSettings, updateTheme } from '@keeper/kam'

// Get user's current theme
const settings = await getUserSettings(userId)
console.log(settings.theme) // "Keeper Classic" by default

// Update theme preference
await updateTheme(userId, 'Dark Mode')
```

---

## 🧪 Testing Strategy

### 🧪 Unit Tests

```bash
# Run all tests
pnpm test

# Run tests for specific package
pnpm --filter @keeper/kam test

# Run tests in watch mode
pnpm test:watch
```

### 🔍 Type Checking

```bash
# Check types across entire monorepo
pnpm type-check

# Check specific app
pnpm --filter apps/web type-check
```

---

## 📦 Package Management

### 🔧 Adding Dependencies

```bash
# Add to specific app
pnpm --filter apps/web add react-query

# Add to specific package  
pnpm --filter @keeper/kam add zod

# Add to root (dev tools)
pnpm add -D typescript
```

### 🔗 Workspace Dependencies

```json
// In any app/package package.json
{
  "dependencies": {
    "@keeper/kam": "workspace:*",
    "@keeper/shared": "workspace:*",
    "@keeper/database": "workspace:*"
  }
}
```

---

## 🐛 Troubleshooting

### 🔄 Common Issues

**Build Failures:**
```bash
# Clear all caches and rebuild
pnpm clean
pnpm build
```

**Type Errors:**
```bash
# Regenerate TypeScript project references
pnpm type-check
```

**Dependency Issues:**
```bash
# Reinstall all dependencies
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install
```

### 📋 Debug Commands

```bash
# Check workspace structure
pnpm list --depth=0

# Analyze bundle size
pnpm --filter apps/web build:analyze

# Check for circular dependencies
pnpm madge --circular --extensions ts,tsx apps/web/src
```

---

## 🎯 Migration Notes

### 📈 From Previous Structure

This monorepo structure replaces the previous `frontend/` + `backend/` organization:

- ✅ **Better**: Scalable, industry-standard structure
- ✅ **Better**: Optimized builds with Turborepo caching
- ✅ **Better**: Clear separation of concerns with packages
- ✅ **Better**: Deployment platform compatibility

### 🚀 Benefits Achieved

1. **40-85% faster builds** through intelligent caching
2. **Clear domain boundaries** with KAM and future Kip packages
3. **Type safety** across the entire platform
4. **Simplified deployments** with platform-specific configurations
5. **Future-proof architecture** ready for AI services and mobile apps

---

## 🤝 Contributing

### 📋 Development Workflow

1. **Clone and install**:
   ```bash
   git clone <repository>
   cd keeper-platform
   pnpm install
   ```

2. **Start development**:
   ```bash
   pnpm dev  # Starts both web and api
   ```

3. **Make changes** following the patterns above

4. **Test and build**:
   ```bash
   pnpm lint
   pnpm type-check  
   pnpm build
   ```

### 📝 Commit Standards

- Every commit must conform to this architecture
- Breaking changes require discussion and versioning
- Follow conventional commit format: `feat:`, `fix:`, `refactor:`

---

## 📚 Additional Resources

- **Turborepo Documentation**: https://turbo.build/repo/docs
- **pnpm Workspaces**: https://pnpm.io/workspaces
- **Prisma Documentation**: https://www.prisma.io/docs
- **Vercel Deployment**: https://vercel.com/docs
- **Railway Deployment**: https://docs.railway.app

---

## 📞 Support

- **Architecture Questions**: Refer to package README files
- **Database Schema**: See `prisma/MODEL_REFERENCE.MD`
- **KAM Documentation**: See `packages/kam/README.md`
- **Deployment Issues**: Check platform-specific configs

---

*This README and the Keeper Platform architecture are authored by platform engineering leadership in partnership with Kip. The goal is to create an elegant, scalable, and trustworthy development experience across the entire platform.*
