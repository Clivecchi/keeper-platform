# @keeper/kam - Keeper Access Management

## 📌 Purpose

KAM (Keeper Access Management) is the centralized authentication and identity management system for the Keeper Platform. This package provides all functionality related to user authentication, session management, user settings, and access control across the entire platform.

**Key Responsibilities:**
- User authentication (sign-up, sign-in, sign-out)
- Session management and validation
- User settings and preferences (themes, profiles)
- Authorization and access control
- Password management and security

## 🧱 Key Files

- `src/index.ts` - Main package entry point with all exports
- `src/auth/` - Core authentication logic and handlers
- `src/settings/` - User preferences and settings management
- `src/types/` - TypeScript type definitions
- `src/lib/` - Utility functions and helpers
- `src/hooks/` - React hooks for frontend integration
- `src/api/` - API endpoint handlers

## 🔄 Data & Behavior

### Authentication Flow
1. **Registration**: New users are created with default "Keeper Classic" theme
2. **Login**: Email/password validation with JWT token generation
3. **Session**: Token-based session management with expiration
4. **Logout**: Session invalidation and cleanup

### Data Models Used
- **User**: Core user account information
- **UserSettings**: Theme preferences and system settings
- **Theme**: Available theme configurations

### State Management
- Server-side session validation
- Client-side auth state via React hooks
- Theme preferences persist to database
- Automatic theme assignment on registration

## 📦 Installation & Usage

### In Web App
```typescript
import { 
  loginUserHandler, 
  registerUserHandler,
  getUserSettingsHandler 
} from '@keeper/kam'

// Use in components or API routes
const handleLogin = async () => {
  const result = await loginUserHandler({
    email: 'user@example.com',
    password: 'secure-password'
  })
}
```

### In API App
```typescript
import { 
  getSessionHandler,
  updateUserSettingsHandler 
} from '@keeper/kam'

// Use in Express routes
app.post('/api/auth/login', loginUserHandler)
app.get('/api/auth/session', getSessionHandler)
```

### Type Imports
```typescript
import type {
  KAMUser,
  AuthSession,
  LoginInput,
  RegisterInput,
  UserSettings
} from '@keeper/kam/types'
```

## 🏗️ Architecture

### Module Organization
```
src/
├── auth/              # Authentication logic
│   ├── index.ts       # Auth exports
│   ├── login.ts       # Login handler
│   ├── register.ts    # Registration handler
│   ├── logout.ts      # Logout handler
│   ├── session.ts     # Session management
│   └── types.ts       # Auth types
├── settings/          # User preferences
│   ├── index.ts       # Settings exports
│   ├── getSettings.ts # Get user settings
│   ├── updateSettings.ts # Update settings
│   └── types.ts       # Settings types
├── types/             # Shared types
│   └── index.ts       # All type exports
├── lib/               # Utilities
│   └── index.ts       # Helper functions
├── hooks/             # React hooks
│   └── index.ts       # Hook exports
├── api/               # API handlers
│   └── index.ts       # API exports
└── index.ts           # Main package entry
```

### Dependencies
- **bcryptjs**: Password hashing and validation
- **jsonwebtoken**: JWT token generation and verification
- **zod**: Runtime type validation and schemas

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure session tokens with expiration
- **Input Validation**: Zod schemas for all inputs
- **Type Safety**: Full TypeScript coverage
- **Session Management**: Secure token invalidation

## 🎨 Theme Integration

KAM automatically handles theme assignment:

1. **Default Theme**: All new users get "Keeper Classic" theme
2. **Theme Persistence**: User theme preferences saved to database
3. **System Respect**: Option to follow system theme preferences
4. **Dynamic Loading**: Themes loaded from database configuration

## 🧪 Testing

```bash
# Run KAM-specific tests
pnpm --filter @keeper/kam test

# Type checking
pnpm --filter @keeper/kam type-check

# Build package
pnpm --filter @keeper/kam build
```

## 🔗 Integration Examples

### Frontend Integration
```typescript
// In React components
import { useAuth } from '@keeper/kam/hooks'

function LoginForm() {
  const { login, isLoading, error } = useAuth()
  
  const handleSubmit = async (data) => {
    await login(data)
  }
  
  return <form onSubmit={handleSubmit}>...</form>
}
```

### Backend Integration
```typescript
// In Express middleware
import { getSessionHandler } from '@keeper/kam'

app.use('/api/protected', async (req, res, next) => {
  const session = await getSessionHandler(req.headers.authorization)
  if (!session.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  req.user = session.user
  next()
})
```

## ⚠️ Notes & ToDo

- [x] Fixed dev environment build issues by changing TypeScript moduleResolution from "bundler" to "node"
- [x] Ensured JavaScript files are generated for workspace consumption
- [ ] Add comprehensive testing for all auth flows
- [ ] Behavior to confirm with Kip

## 🔄 Migration Notes

This package was extracted from the previous `apps/web/src/kam` and `apps/api/src/kam` structures to provide a centralized, reusable authentication system across the entire Keeper Platform.

**Breaking Changes from Previous Structure:**
- Import paths changed from relative to `@keeper/kam`
- Package now works across both web and API applications
- All KAM functionality consolidated in single package

## 📆 Update Log
- **2025-06-23**: Created @keeper/kam package during monorepo migration
- **2025-06-23**: Consolidated auth logic from web and API apps
- **2025-06-23**: Added comprehensive TypeScript configurations
- **2025-06-23**: Implemented package exports for modular imports
- **2025-06-25T02:03:00Z**: Dev Environment Fix
- 2025-06-25 – Fixed TypeScript errors in domainAuth.ts and ensured all code paths return a value. 
 - 2025-09-06 – API: Added KAM service key loader and dev-only diagnostics in `apps/api/src/kam`.
 - 2025-09-06 – API: `/kam/agents/:agentId/home` now supports domain discovery (no domain header).
 - 2025-09-06 – API: ID/list routes allow domainless agents (no domain header required when agent has no domain).