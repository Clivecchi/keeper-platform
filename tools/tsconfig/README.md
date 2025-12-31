# TypeScript Configurations

## 📌 Purpose

This directory contains shared TypeScript configurations for the Keeper Platform monorepo. These base configurations ensure consistent TypeScript settings across all apps and packages while allowing for environment-specific customizations.

## 🧱 Key Files

- `base.json` - Core TypeScript configuration shared by all projects
- `node.json` - Node.js/server-side specific configuration  
- `react.json` - React/browser specific configuration

## 🔄 Data & Behavior

### Configuration Hierarchy
```
base.json (core settings)
├── node.json (extends base + Node.js specific)
└── react.json (extends base + React specific)
```

### Key Settings Applied
- **Strict Mode**: Full TypeScript strict mode enabled
- **ES2020 Target**: Modern JavaScript features supported
- **Source Maps**: Enabled for debugging in all environments
- **Declaration Files**: Generated for all packages
- **Module Resolution**: Environment-specific (NodeNext vs Bundler)

## 📦 Usage

### In Node.js Projects (API, Database packages)
```json
{
  "extends": "../../tools/tsconfig/node.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist"
  }
}
```

### In React Projects (Web app)
```json
{
  "extends": "../../tools/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### For Shared Packages (KAM, Database)
```json
{
  "extends": "../../tools/tsconfig/base.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## 🏗️ Configuration Details

### Base Configuration (`base.json`)
- **Target**: ES2020 for modern feature support
- **Strict Checks**: All strict TypeScript checks enabled
- **Declarations**: Source maps and declaration files generated
- **Isolation**: `isolatedModules` for build tool compatibility
- **Error Prevention**: Prevents common TypeScript mistakes

### Node.js Configuration (`node.json`)
- **Module System**: NodeNext for native Node.js ES modules
- **Resolution**: NodeNext for Node.js module resolution
- **Types**: Node.js type definitions included
- **JSON Imports**: Enabled for configuration files

### React Configuration (`react.json`)
- **JSX**: React JSX transform enabled
- **DOM Types**: Browser and DOM type definitions
- **Module Resolution**: Bundler mode for Vite/Webpack
- **Vite Types**: Vite client types for development

## 🔧 Customization Guidelines

### Project-Specific Overrides
Each project can override base settings:

```json
{
  "extends": "../../tools/tsconfig/base.json",
  "compilerOptions": {
    // Override base settings here
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["custom-includes/**/*"],
  "exclude": ["custom-excludes/**/*"]
}
```

### Common Overrides
- **Path Mapping**: For import aliases (`@/*`)
- **Root/Output Directories**: For build customization
- **Includes/Excludes**: For project-specific file patterns

## ⚙️ Build Integration

### With Turborepo
These configurations work seamlessly with Turborepo's build pipeline:

```json
{
  "pipeline": {
    "type-check": {
      "outputs": []
    },
    "build": {
      "dependsOn": ["^build", "type-check"],
      "outputs": ["dist/**"]
    }
  }
}
```

### IDE Integration
Modern IDEs automatically detect and use these configurations:
- **VS Code**: Uses nearest tsconfig.json
- **WebStorm**: Automatically detects TypeScript projects
- **Vim/Neovim**: With TypeScript LSP support

## 🧪 Type Checking

### Workspace-Wide Type Checking
```bash
# Check all projects at once
pnpm type-check

# Check specific project
pnpm --filter apps/web type-check
```

### Development Workflow
```bash
# Watch mode for development
pnpm --filter @keeper/kam dev  # Uses "tsc --watch"
```

## 📋 Best Practices

### Path Mapping
Use consistent path mapping across projects:
```json
{
  "paths": {
    "@/*": ["src/*"],           # Internal project files
    "@keeper/kam": ["../../packages/kam/src/index.ts"],
    "@keeper/database": ["../../packages/database/src/index.ts"]
  }
}
```

### Strict Settings
Keep strict settings enabled for code quality:
- `strict: true` - All strict checks
- `noImplicitAny: true` - Prevent implicit any
- `noImplicitReturns: true` - Require return statements

### Module Resolution
Choose appropriate module resolution:
- **NodeNext**: For Node.js packages and API
- **Bundler**: For React apps and bundled code

## ⚠️ Notes & ToDo

- [ ] Add configuration for testing frameworks (Jest/Vitest)
- [ ] Consider library-specific configs for different package types
- [ ] Add performance optimization settings for large codebases
- [ ] Document compatibility with different bundlers

## 🔄 Migration Notes

These configurations were created to replace scattered tsconfig.json files throughout the codebase. They provide:

- **Consistency**: Same base settings across all projects
- **Maintainability**: Single place to update TypeScript settings
- **Environment Specificity**: Tailored configs for Node.js vs React
- **IDE Support**: Better development experience

## 📆 Update Log

- **2025-06-23**: Created shared TypeScript configurations during monorepo migration
- **2025-06-23**: Added base, Node.js, and React specific configurations
- **2025-06-23**: Implemented strict type checking across all projects
- **2025-06-23**: Added path mapping support for workspace packages

---

**Authored by**: Platform Engineering Team  
**Architecture Partner**: Kip  
**Configuration Version**: 1.0.0 