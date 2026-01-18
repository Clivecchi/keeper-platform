# 📌 Purpose

Board management services providing core business logic for Domain Board operations. Handles board CRUD, frame management, and domain permission validation.

## 🧱 Key Files

- `BoardsService.ts` - Core board management operations (NEW)
  - setViewerMode - Control board viewer access
  - addFrame - Add frames to boards
  - updateFrame - Update frame properties
  - setCover - Set board cover image
  - upsertNav - Manage navigation items
  - publishBoard - Publish/unpublish boards
  - checkBoardPermission - Domain permission validation

- `boardResolver.ts` - Board resolution and lookup utilities
- `domainManagement.ts` - Domain-specific board operations
- `README.md` - This file

## 🔄 Data & Behavior

### Permission Model
All board operations check domain permissions:
- Requires: owner, admin, or editor role on the board's domain
- Falls back gracefully with ACCESS_DENIED error

### Board Configuration
Uses `Board.config` JSON field to store:
- `coverId` - Media ID for board cover image
- `nav` - Array of navigation items `{label, href, icon?}`

### Frame Management
- Frames link to boards via `boardId`
- Auto-increments `orderIndex` when adding frames
- Validates patch fields in updateFrame (whitelist)

### Media Upload
Currently returns mock responses - integrate with actual media service later.

## API Usage Examples

### Set Viewer Mode
```typescript
import { setViewerMode } from './BoardsService';

const result = await setViewerMode({
  boardId: 'board-uuid',
  mode: 'public',
  userId: 'user-uuid'
});
```

### Add Frame
```typescript
import { addFrame } from './BoardsService';

const result = await addFrame({
  boardId: 'board-uuid',
  pattern: 'dialogic',
  name: 'Cover Frame',
  index: 0,
  props: { style: 'modern' },
  userId: 'user-uuid'
});
```

### Update Frame
```typescript
import { updateFrame } from './BoardsService';

const result = await updateFrame({
  frameId: 'frame-uuid',
  patch: { name: 'New Name', props: { color: 'blue' } },
  userId: 'user-uuid'
});
```

### Set Cover
```typescript
import { setCover } from './BoardsService';

const result = await setCover({
  boardId: 'board-uuid',
  mediaId: 'media-uuid',
  userId: 'user-uuid'
});
```

### Upsert Navigation
```typescript
import { upsertNav } from './BoardsService';

const result = await upsertNav({
  boardId: 'board-uuid',
  items: [
    { label: 'Home', href: '/', icon: 'home' },
    { label: 'About', href: '/about' }
  ],
  userId: 'user-uuid'
});
```

### Publish Board
```typescript
import { publishBoard } from './BoardsService';

const result = await publishBoard({
  boardId: 'board-uuid',
  isPublic: true,
  userId: 'user-uuid'
});
```

## Error Handling

All functions throw errors with specific codes:
- `ACCESS_DENIED` - User lacks domain permission
- `FRAME_NOT_FOUND` - Frame doesn't exist
- `BOARD_NOT_FOUND` - Board doesn't exist
- `INVALID_PATCH` - No valid fields in patch

Routes should catch these and map to appropriate HTTP status codes.

## ⚠️ Notes & ToDo

- [ ] Integrate real media upload service (currently mocked)
- [ ] Add frame bulk operations (reorder, delete multiple)
- [ ] Add frame visibility toggle endpoint
- [ ] Consider caching permission checks
- [ ] Add frame soft-delete support
- [ ] Add board cloning/templating

## 📆 Update Log

### 2026-01-18 - Domain home board ensure
- Added canonical ensure logic for `boardType="domain-home"` with adoption rules and minimal frames.

### 2025-11-09 - Domain Board Management Implementation
- Created `BoardsService.ts` with 6 core operations
- Added domain permission checking via `checkBoardPermission`
- Implemented config-based storage for nav and cover
- Added frame CRUD with proper ordering
- All operations return deterministic success payloads
- Ready for integration with engagement templates
