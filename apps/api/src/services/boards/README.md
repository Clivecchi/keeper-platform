# Board Services

## 📌 Purpose

This folder contains board-related business logic and services for the Keeper platform, including board resolution, template management, and domain-specific board operations.

## 🧱 Key Files

- `boardResolver.ts` - Runtime board resolution for Keeper Types and records
- `domainManagement.ts` - Domain-specific board operations
- `README.md` - This file

## 🔄 Data & Behavior

### Board Resolver Service

The `boardResolver.ts` module provides the core logic for resolving which board template to use for a given record or entity.

**Key Functions:**

1. **`resolveBoardForRecord(prisma, recordId)`**
   - Resolves board for generic KeeperRecord
   - Resolution order: Custom board → Default template → Error
   - Returns board with frames included

2. **`resolveBoardForEntity(prisma, entityType, entityId)`**
   - Helper for first-class entities (Keeper, Journey, Agent, Domain)
   - Backwards compatible with existing models
   - Returns null if no template available

3. **`getAllBoardTemplates(prisma)`**
   - Fetches all boards with `isTemplate = true`
   - Includes frames ordered by orderIndex
   - Useful for template galleries

4. **`forkTemplateForRecord(prisma, recordId, templateBoardId, keeperId)`**
   - Creates custom board from template
   - Copies all frames with proper configuration
   - Links to specific record automatically

### Data Flow

```
KeeperRecord → [Resolver] → Custom Board? → Yes → Return Custom Board
                    ↓
                    No
                    ↓
            Default Template? → Yes → Return Template
                    ↓
                    No
                    ↓
                 Error
```

### State Management

- **Prisma Relations:** Board ↔ KeeperType (default template)
- **Prisma Relations:** Board ↔ KeeperRecord (custom board)
- **Caching:** Results can be cached at API layer
- **Transactions:** Fork operation uses Prisma transactions

## ⚠️ Notes & ToDo

### Current Status
- ✅ Board resolution for generic KeeperRecord
- ✅ First-class entity support (Keeper, Journey, Domain, Agent)
- ✅ Template forking functionality
- ✅ Comprehensive error handling

### Future Improvements
- [ ] Add caching layer for frequently accessed templates
- [ ] Implement template versioning
- [ ] Add template update propagation to instances
- [ ] Add rollback capability for forked boards
- [ ] Add template inheritance (template extends template)
- [ ] Add permission checks for template access
- [ ] Add analytics for template usage

### Known Limitations
- Template changes don't propagate to existing instances
- No version control for templates
- No diff/merge for template updates
- Fork operation doesn't preserve frame IDs (creates new)

## 📆 Update Log

### 2025-10-30 - Initial Implementation
- Created `boardResolver.ts` with core resolution functions
- Added support for generic KeeperRecord model
- Added backwards compatibility for first-class entities
- Implemented template forking functionality
- Added comprehensive TypeScript types
- Documented API and usage patterns

## 🔧 Usage Examples

### Basic Resolution

```typescript
import { resolveBoardForRecord } from './boardResolver';
import { PrismaClient } from '@keeper/database';

const prisma = new PrismaClient();

// Resolve board for a record
const result = await resolveBoardForRecord(prisma, recordId);

console.log(`Board: ${result.board.name}`);
console.log(`Source: ${result.source}`);
console.log(`Frames: ${result.board.frames.length}`);
```

### Template Management

```typescript
import { getAllBoardTemplates } from './boardResolver';

// Get all templates for a template gallery
const templates = await getAllBoardTemplates(prisma);

templates.forEach(template => {
  console.log(`${template.name}: ${template.frames.length} frames`);
});
```

### Custom Board Creation

```typescript
import { forkTemplateForRecord } from './boardResolver';

// Create a custom board for a specific record
const customBoard = await forkTemplateForRecord(
  prisma,
  recordId,
  templateBoardId,
  keeperId
);

console.log(`Created custom board: ${customBoard.id}`);
```

### Error Handling

```typescript
try {
  const result = await resolveBoardForRecord(prisma, recordId);
  // Use result.board
} catch (error) {
  if (error.message.includes('No record found')) {
    // Handle missing record
  } else if (error.message.includes('No board available')) {
    // Handle missing template
  } else {
    // Handle other errors
  }
}
```

## 🏗️ Architecture

### Design Patterns

- **Service Layer:** Business logic separated from controllers
- **Repository Pattern:** Prisma queries abstracted into functions
- **Factory Pattern:** Board forking creates new instances from templates
- **Strategy Pattern:** Different resolution strategies for different entity types

### Dependencies

- `@keeper/database` - Prisma Client
- Node.js built-ins (no external runtime dependencies)

### Integration Points

- **API Routes:** Used by board and record endpoints
- **Seed Scripts:** Templates created by seed scripts
- **Studio UI:** Resolved boards rendered in Board Studio
- **Runtime Views:** Quote, Journey, Domain views use resolver

## 🧪 Testing

### Unit Tests (Recommended)

```typescript
describe('boardResolver', () => {
  describe('resolveBoardForRecord', () => {
    it('should return custom board if set', async () => {
      // Test custom board priority
    });

    it('should fall back to default template', async () => {
      // Test template fallback
    });

    it('should throw error if no board available', async () => {
      // Test error case
    });
  });

  describe('forkTemplateForRecord', () => {
    it('should create new board with copied frames', async () => {
      // Test forking
    });

    it('should link to record', async () => {
      // Test linking
    });
  });
});
```

## 📚 Related Documentation

- [Design Board Migration Guide](../../../../../../DESIGN_BOARD_MIGRATION.md)
- [Implementation Summary](../../../../../../DESIGN_BOARD_IMPLEMENTATION_SUMMARY.md)
- [Prisma Schema](../../../../../../packages/database/prisma/schema.prisma)
- [Design Board Types](../../types/design-boards.ts)
