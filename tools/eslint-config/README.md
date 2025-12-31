# ESLint Configurations

## 📌 Purpose

This directory contains shared ESLint configurations for the Keeper Platform monorepo. These configurations enforce consistent code quality, style, and best practices across all TypeScript and React code while respecting platform-specific naming conventions.

## 🧱 Key Files

- `index.js` - Base ESLint configuration for TypeScript projects
- `react.js` - React/JSX specific configuration extending base
- `node.js` - Node.js/server specific configuration extending base
- `package.json` - Package definition with required ESLint dependencies

## 🔄 Data & Behavior

### Configuration Hierarchy
```
index.js (base TypeScript rules)
├── react.js (extends base + React/JSX rules)
└── node.js (extends base + Node.js specific rules)
```

### Key Rules Enforced
- **TypeScript**: Strict typing, no unused variables, prefer const
- **Code Quality**: No console.log (warn), no debugger, prefer modern syntax
- **Keeper Conventions**: Allows database field naming (`preferred_theme_id`, `avatar_url`)
- **Import Rules**: Prevents duplicate imports, encourages workspace packages

## 📦 Usage

### In React Projects (Web app)
```json
{
  "extends": ["@keeper/eslint-config/react"],
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

### In Node.js Projects (API, packages)
```json
{
  "extends": ["@keeper/eslint-config/node"],
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

### In Shared Packages
```json
{
  "extends": ["@keeper/eslint-config"],
  "parserOptions": {
    "project": "./tsconfig.json"
  }
}
```

## 🏗️ Configuration Details

### Base Configuration (`index.js`)
**TypeScript Rules:**
- `@typescript-eslint/no-unused-vars`: Error (with underscore ignore pattern)
- `@typescript-eslint/no-explicit-any`: Warning
- `@typescript-eslint/prefer-const`: Error

**Code Quality Rules:**
- `no-console`: Warning (can be overridden in Node.js)
- `no-debugger`: Error
- `prefer-template`: Error (use template literals)
- `object-shorthand`: Error

**Keeper Platform Rules:**
- `camelcase`: Warning with exceptions for database fields
- Allows: `preferred_theme_id`, `avatar_url`, `hashedPassword`

### React Configuration (`react.js`)
**React Rules:**
- `react/react-in-jsx-scope`: Off (React 17+ auto-import)
- `react/prop-types`: Off (using TypeScript)
- `react/jsx-key`: Error
- `react/jsx-no-duplicate-props`: Error

**React Hooks Rules:**
- `react-hooks/rules-of-hooks`: Error
- `react-hooks/exhaustive-deps`: Warning

**JSX Formatting:**
- `react/jsx-fragments`: Syntax preference
- `react/jsx-boolean-value`: Never explicit
- Function components preferred as function declarations

### Node.js Configuration (`node.js`)
**Node.js Rules:**
- `no-console`: Off (acceptable in server code)
- `no-process-exit`: Error
- `handle-callback-err`: Error
- `no-path-concat`: Error

**Import Rules:**
- Restricts deep relative imports (`../../../*`)
- Encourages workspace package imports (`@keeper/*`)

## 🔧 Project Customization

### Override Rules
Projects can override specific rules:

```json
{
  "extends": ["@keeper/eslint-config/react"],
  "rules": {
    "no-console": "off",
    "@typescript-eslint/no-explicit-any": "off"
  }
}
```

### Environment-Specific Overrides
```json
{
  "extends": ["@keeper/eslint-config"],
  "overrides": [
    {
      "files": ["*.test.ts", "*.spec.ts"],
      "rules": {
        "@typescript-eslint/no-explicit-any": "off"
      }
    }
  ]
}
```

## ⚙️ Integration

### With Package Scripts
```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "lint:check": "eslint . --max-warnings 0"
  }
}
```

### With Turborepo Pipeline
```json
{
  "pipeline": {
    "lint": {
      "outputs": []
    },
    "build": {
      "dependsOn": ["lint"]
    }
  }
}
```

### IDE Integration
Most IDEs automatically detect and use ESLint configurations:
- **VS Code**: Install ESLint extension
- **WebStorm**: Built-in ESLint support
- **Vim/Neovim**: With appropriate plugins

## 🎯 Keeper Platform Conventions

### Database Field Naming
Allows snake_case for database fields that match Prisma schema:
```typescript
// ✅ Allowed
const settings = {
  preferred_theme_id: 'theme-123',
  avatar_url: 'https://example.com/avatar.jpg'
}

// ✅ Also allowed via destructuring
const { preferred_theme_id, avatar_url } = userSettings
```

### Import Patterns
Encourages workspace package imports:
```typescript
// ✅ Preferred
import { loginUser } from '@keeper/kam'
import { prisma } from '@keeper/database'

// ❌ Discouraged
import { loginUser } from '../../../packages/kam/src/auth/login'
```

### Function Component Style
Prefers function declarations for named components:
```typescript
// ✅ Preferred
function UserProfile({ user }: UserProfileProps) {
  return <div>{user.name}</div>
}

// ✅ Also acceptable for inline/callback components
const mapUsers = users.map(user => <UserItem key={user.id} user={user} />)
```

## 🧪 Development Workflow

### Linting Commands
```bash
# Lint entire workspace
pnpm lint

# Lint specific project
pnpm --filter apps/web lint

# Fix auto-fixable issues
pnpm --filter apps/web lint:fix

# Check for any warnings (CI)
pnpm lint:check
```

### Pre-commit Integration
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "git add"]
  }
}
```

## 📋 Rule Categories

### Error Level Rules (Must Fix)
- TypeScript errors (`@typescript-eslint/no-unused-vars`)
- React errors (`react/jsx-key`, `react-hooks/rules-of-hooks`)
- Code bugs (`no-debugger`, `no-duplicate-imports`)

### Warning Level Rules (Should Fix)
- Code quality (`no-console`, `@typescript-eslint/no-explicit-any`)
- Style preferences (`camelcase`, `react/display-name`)

### Disabled Rules (Intentionally Off)
- `react/react-in-jsx-scope` (React 17+ auto-import)
- `react/prop-types` (TypeScript provides type checking)
- `@typescript-eslint/explicit-function-return-type` (inferred types acceptable)

## ⚠️ Notes & ToDo

- [ ] Add rules for testing files (Jest/Vitest specific)
- [ ] Consider adding import sorting rules
- [ ] Add accessibility rules for React components
- [ ] Consider performance rules for React hooks
- [ ] Add rules for async/await patterns

## 🔄 Migration Notes

These ESLint configurations replace project-specific .eslintrc files to provide:

- **Consistency**: Same code quality standards across all projects
- **Platform Awareness**: Rules that understand Keeper Platform conventions
- **Environment Specificity**: Different rules for React vs Node.js
- **Maintainability**: Single place to update linting rules

## 📆 Update Log

- **2025-06-23**: Created shared ESLint configurations during monorepo migration
- **2025-06-23**: Added base, React, and Node.js specific configurations
- **2025-06-23**: Implemented Keeper Platform naming conventions
- **2025-06-23**: Added workspace package import preferences

---

**Authored by**: Platform Engineering Team  
**Architecture Partner**: Kip  
**Configuration Version**: 1.0.0 