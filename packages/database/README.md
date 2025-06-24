# @keeper/database - Database Package

## 📌 Purpose

The Database package provides centralized database access and management for the Keeper Platform using Prisma ORM. This package includes the Prisma client, database schema, common query helpers, and type definitions that are shared across all applications.

**Key Responsibilities:**
- Prisma client configuration and singleton management
- Database schema definition and migrations
- Common database queries and helpers
- Type-safe database operations
- Database health monitoring and utilities

## 🧱 Key Files

- `src/index.ts` - Main package entry with Prisma client setup
- `src/queries/index.ts` - Common database query helpers
- `src/types.ts` - Extended database types and utilities
- `prisma/schema.prisma` - Database schema definition
- `prisma/MODEL_REFERENCE.MD` - Database model documentation

## 🔄 Data & Behavior

### Database Models
The schema includes core models for the Keeper Platform:

- **users**: User accounts and authentication data
- **UserSettings**: User preferences and theme settings
- **themes**: Available platform themes and styling
- **KeeperMapping**: Memory and journey relationships
- **MediaContent**: File and media management
- **Journey/Path/Moment**: User content organization

### Connection Management
- **Singleton Pattern**: Prevents multiple Prisma client instances
- **Development Logging**: Query logging in development mode
- **Connection Pooling**: Automatic connection management
- **Health Checks**: Database connectivity monitoring

### Query Optimization
- **Type Safety**: Full TypeScript coverage for all queries
- **Relationship Loading**: Optimized includes and selects
- **Error Handling**: Consistent error patterns
- **Transaction Support**: Complex operation handling

## 📦 Installation & Usage

### Basic Usage
```typescript
// Import Prisma client
import { prisma } from '@keeper/database'

// Use client directly
const users = await prisma.users.findMany()
```

### Query Helpers
```typescript
// Import pre-built query helpers
import { 
  getUserWithSettings,
  createUserWithDefaultSettings,
  updateUserTheme 
} from '@keeper/database/queries'

// Use helper functions
const user = await getUserWithSettings('user-id')
const newUser = await createUserWithDefaultSettings({
  email: 'user@example.com',
  hashedPassword: 'hashed-password',
  name: 'John Doe'
})
```

### Type Imports
```typescript
import type {
  User,
  UserSettings,
  Theme,
  UserWithSettings,
  CreateUserInput,
  DatabaseResult
} from '@keeper/database/types'
```

## 🏗️ Architecture

### Package Structure
```
src/
├── index.ts           # Main entry point with Prisma client
├── queries/
│   └── index.ts       # Common database queries
└── types.ts           # Extended database types

prisma/
├── schema.prisma      # Database schema definition
├── MODEL_REFERENCE.MD # Model documentation
└── README.md          # Prisma-specific documentation
```

### Key Components

#### Prisma Client Singleton
```typescript
// Prevents multiple instances in development
export const prisma = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})
```

#### Query Helpers
Pre-built functions for common operations:
- User management (create, read, update)
- Settings management (themes, preferences)
- Theme operations (get, update)
- Utility functions (health checks, counting)

#### Type Extensions
Additional types that extend Prisma generated types:
- `UserWithSettings` - User with nested settings and theme
- `CreateUserInput` - User creation parameters
- `DatabaseResult<T>` - Standard operation result wrapper

## 🎨 Theme Integration

The database package handles theme assignment and management:

### Default Theme Assignment
```typescript
// Automatically assigns "Keeper Classic" theme to new users
const newUser = await createUserWithDefaultSettings({
  email: 'user@example.com',
  hashedPassword: 'hashed-password'
})
// User will have Keeper Classic theme assigned
```

### Theme Queries
```typescript
import { getAllThemes, getThemeByName, updateUserTheme } from '@keeper/database/queries'

// Get all available themes
const themes = await getAllThemes()

// Update user's theme
await updateUserTheme('user-id', 'theme-id', 'dark')
```

## 🔧 Database Operations

### Migrations
```bash
# Generate Prisma client
pnpm --filter @keeper/database generate

# Push schema changes
pnpm --filter @keeper/database push

# Run migrations
pnpm --filter @keeper/database migrate

# Reset database (development)
pnpm --filter @keeper/database reset
```

### Schema Management
```bash
# Pull schema from database
pnpm --filter @keeper/database pull

# Open Prisma Studio
pnpm --filter @keeper/database studio
```

### Health Monitoring
```typescript
import { checkDatabaseHealth, connectDatabase } from '@keeper/database'

// Check connection health
const health = await checkDatabaseHealth()
console.log(health.status) // 'healthy' | 'unhealthy'

// Manual connection (usually not needed)
await connectDatabase()
```

## 🧪 Testing & Development

### Type Checking
```bash
# Check TypeScript types
pnpm --filter @keeper/database type-check
```

### Building
```bash
# Build package
pnpm --filter @keeper/database build

# Watch mode
pnpm --filter @keeper/database dev
```

### Prisma Studio
```bash
# Open database GUI
pnpm --filter @keeper/database studio
```

## 🔗 Integration Examples

### In API Routes
```typescript
import { getUserWithSettings, updateUserSettings } from '@keeper/database/queries'

// Express route handler
app.get('/api/user/:id', async (req, res) => {
  try {
    const user = await getUserWithSettings(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.json({ user })
  } catch (error) {
    res.status(500).json({ error: 'Database error' })
  }
})
```

### In KAM Package
```typescript
// Used by @keeper/kam for user operations
import { createUserWithDefaultSettings, getUserByEmail } from '@keeper/database/queries'

export async function registerUser(data: RegisterInput) {
  const existingUser = await getUserByEmail(data.email)
  if (existingUser) {
    throw new Error('User already exists')
  }
  
  return createUserWithDefaultSettings({
    email: data.email,
    hashedPassword: await hash(data.password),
    name: data.name
  })
}
```

## 🚨 Error Handling

### Common Patterns
```typescript
import type { DatabaseResult } from '@keeper/database/types'

// Wrapper for safe database operations
async function safeQuery<T>(operation: () => Promise<T>): Promise<DatabaseResult<T>> {
  try {
    const data = await operation()
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}
```

### Prisma Error Handling
```typescript
import { Prisma } from '@prisma/client'

try {
  await prisma.users.create({ data: userData })
} catch (error) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      // Unique constraint violation
      throw new Error('Email already exists')
    }
  }
  throw error
}
```

## ⚠️ Notes & ToDo

- [ ] Add database seeding functionality
- [ ] Implement soft delete patterns
- [ ] Add pagination helpers for large datasets
- [ ] Consider read replicas for performance
- [ ] Add database backup utilities
- [ ] Implement audit logging for sensitive operations

## 🔄 Migration Notes

This package was created during the monorepo migration to centralize all database logic. The Prisma schema and related files were moved from the root `prisma/` directory to provide better organization and reusability.

**Key Changes:**
- Prisma client now uses singleton pattern for better development experience
- Query helpers extracted for common operations
- Types extended beyond Prisma generated types
- Database utilities added for health checks and connection management

## 📆 Update Log

- **2025-06-23**: Created @keeper/database package during monorepo migration
- **2025-06-23**: Moved Prisma schema and configuration
- **2025-06-23**: Added query helpers for user and theme operations
- **2025-06-23**: Implemented Prisma client singleton pattern
- **2025-06-23**: Added comprehensive TypeScript type definitions

---

**Authored by**: Platform Engineering Team  
**Architecture Partner**: Kip  
**Package Version**: 0.1.0 