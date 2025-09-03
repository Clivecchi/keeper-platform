# @keeper/database - Database Package

## 📌 Purpose
The Database package provides centralized database access and management for the Keeper Platform using Prisma ORM. This package includes the Prisma client, database schema, common query helpers, and type definitions that are shared across all applications.

## 🧱 Key Files
- `src/index.ts`
- `src/queries/index.ts`
- `src/types.ts`
- `prisma/schema.prisma`

## 🔄 Data & Behavior
Centralizes Prisma client, schema, and helpers. Exposes stateless helpers and types for API and services.

## ⚠️ Notes & ToDo
- [ ] Pending issues or improvements
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2025-06-23 – Package created during monorepo migration
- 2025-06-25 – Added @keeper/shared dependency and adjusted build order
- 2025-09-03 – Removed TS path alias to shared/src to fix builds; rely on compiled shared output
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
- `prisma/seeds/` - Database seed files

## 🔄 Data & Behavior

### Database Models
The schema includes core models for the Keeper Platform:

- **users**: User accounts and authentication data
- **UserSettings**: User preferences and theme settings
- **themes**: Available platform themes and styling
- **KeeperMapping**: Memory and journey relationships
- **FrameContent**: File and media management for frames
- **FrameConfig**: Frame layout and theme configurations
- **FrameInstance**: Frame instance bindings to entities
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

## 📆 Update Log
- 2025-06-25 – Added @keeper/shared as a dependency and updated build process to ensure correct build order for Railway. 