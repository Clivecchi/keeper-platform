# Frame Count Discrepancy Analysis

**Date:** October 27, 2025  
**Issue:** Frame count shows "8 frames" in left sidebar but "6 frames" in main area  
**Status:** 🔍 Root Cause Identified

## The Discrepancy

### Where the Counts Appear

1. **Left Sidebar (Boards List):** "8 frames"
   - Location: `apps/web/src/pages/studio/board-studio-page.tsx:1699`
   - Source: `{board.frameCount} frames`
   - Data Origin: API response from `/api/board-data?keeperId=...`

2. **Main Area (Board Header):** "6 frames"
   - Location: `apps/web/src/pages/studio/board-studio-page.tsx:1829`
   - Source: `{mockFrames.length} frame{mockFrames.length !== 1 ? 's' : ''}`
   - Data Origin: Local state populated from `/api/board-data/:boardId`

## Root Cause

### The Problem: Stale Metadata vs Actual Data

```javascript
// Line 690-702: Loading boards list
const boardsData = await apiFetch(`/api/board-data?keeperId=${activeKeeper?.id}`);
const transformedBoards = (boardsData.data || []).map((board: any) => ({
  id: board.id,
  name: board.name,
  // ...
  frameCount: board.frameCount || 0,  // ⚠️ This is metadata stored in DB
  // ...
}));
```

```javascript
// Line 561-619: Loading individual board
const boardData = await apiFetch(`/api/board-data/${boardId}`);
const board = boardData.data.board;

// Set frames from API data
const frames = (board.frames || []).map((frame: any) => ({
  // Maps actual frame objects
}));

setMockFrames(frames);  // ✅ This is the actual frame array
```

### The Issue

**Two Different Data Sources:**

1. **`board.frameCount`** (8) = Metadata field stored in the `boards` table
   - Likely a cached/denormalized count
   - Updated when frames are added/removed
   - **Can become stale** if not properly maintained

2. **`board.frames.length`** (6) = Actual frame count from the `frames` array
   - The true source of truth
   - Retrieved when loading the full board
   - Always accurate

### Why They're Different

The `frameCount` metadata in the database is **not being updated** when frames are deleted or modified. This suggests:

1. **Backend Issue:** The API endpoint that deletes frames (`DELETE /api/boards/:boardId/frames/:frameId`) is not updating the `frameCount` field in the `boards` table

2. **Missing Cascade Update:** When frames are removed, the board's `frameCount` isn't recalculated

3. **Data Inconsistency:** The database has 6 actual frames but the `frameCount` field still says 8

## What's Impacted

### 1. **User Confusion** ⚠️
- Users see different frame counts in different places
- Makes the UI look buggy/unreliable
- Harder to trust the interface

### 2. **Board List Display** ⚠️
- The boards list shows incorrect frame counts for all boards
- Users can't accurately compare board sizes

### 3. **Potential Sorting/Filtering Issues** ⚠️
- If there's any logic that sorts/filters boards by frame count, it will be wrong
- Search results might be inaccurate

### 4. **API Consumers** ⚠️
- Any external tools/integrations relying on the `frameCount` field will get wrong data
- Analytics/reporting will be incorrect

### 5. **Not Impacted** ✅
- Actual frame rendering (uses `mockFrames`)
- Frame tabs (uses `mockFrames`)
- Frame operations (uses actual frame objects)
- Preview mode (uses actual frame data)

## Solutions

### Option 1: Fix Backend to Update frameCount (Recommended)

**Backend Changes Needed:**
```javascript
// In /api/boards/:boardId/frames/:frameId DELETE endpoint
async function deleteFrame(req, res) {
  const { boardId, frameId } = req.params;
  
  // Delete the frame
  await db.frames.delete({ id: frameId });
  
  // ✅ Update the board's frameCount
  const remainingFramesCount = await db.frames.count({ 
    where: { boardId } 
  });
  
  await db.boards.update({
    where: { id: boardId },
    data: { frameCount: remainingFramesCount }
  });
  
  res.json({ success: true });
}

// Similarly for POST /frames (add frame)
// And PATCH operations that affect frame visibility/status
```

### Option 2: Calculate frameCount on Read (Alternative)

**Backend Changes:**
```javascript
// In /api/board-data GET endpoint
async function getBoards(req, res) {
  const boards = await db.boards.findMany({
    include: { frames: true }
  });
  
  const boardsWithCount = boards.map(board => ({
    ...board,
    frameCount: board.frames.length  // ✅ Calculate from actual frames
  }));
  
  res.json({ data: boardsWithCount });
}
```

### Option 3: Frontend Workaround (Quick Fix)

**Frontend Change in `board-studio-page.tsx`:**
```javascript
// Line 1699 - Instead of using board.frameCount
<span className="text-xs text-gray-500">
  {selectedBoardId === board.id ? mockFrames.length : board.frameCount} frames
</span>
```

This shows the accurate count for the currently selected board, but still shows stale counts for others.

### Option 4: Remove frameCount Field Entirely (Cleanest)

**Backend:** Remove `frameCount` column from `boards` table
**Frontend:** Always calculate from `board.frames.length`

**Pros:**
- No stale data possible
- Single source of truth
- Less maintenance

**Cons:**
- Slightly more expensive queries (need to join frames)
- Need migration to remove column

## Recommended Action Plan

### Phase 1: Quick Fix (Now)
1. ✅ Document the issue (this file)
2. Add frontend workaround for selected board
3. Log a warning when frameCount mismatch is detected

### Phase 2: Backend Fix (Next Deploy)
1. Update all frame CRUD endpoints to maintain `frameCount`:
   - POST `/api/boards/:boardId/frames` → increment
   - DELETE `/api/boards/:boardId/frames/:frameId` → decrement
   - PATCH operations if they affect frame visibility

2. Add database migration to recalculate all `frameCount` values:
   ```sql
   UPDATE boards b
   SET frameCount = (
     SELECT COUNT(*) 
     FROM frames f 
     WHERE f.boardId = b.id
   );
   ```

### Phase 3: Monitoring (Ongoing)
1. Add health check to detect frameCount mismatches
2. Log when discrepancies are found
3. Auto-heal by recalculating when detected

## Testing Checklist

After implementing fixes:

- [ ] Create a board with 3 frames
- [ ] Verify count shows "3 frames" in both places
- [ ] Delete 1 frame
- [ ] Verify count updates to "2 frames" in both places
- [ ] Add 2 frames
- [ ] Verify count updates to "4 frames" in both places
- [ ] Refresh page
- [ ] Verify counts remain consistent
- [ ] Check console for any mismatch warnings

## Code Locations

**Frontend:**
- Boards list display: `apps/web/src/pages/studio/board-studio-page.tsx:1699`
- Main area display: `apps/web/src/pages/studio/board-studio-page.tsx:1829`
- Board list API call: `apps/web/src/pages/studio/board-studio-page.tsx:691`
- Individual board API call: `apps/web/src/pages/studio/board-studio-page.tsx:561`

**Backend (needs investigation):**
- Boards list endpoint: `/api/board-data?keeperId=...`
- Individual board endpoint: `/api/board-data/:boardId`
- Frame delete endpoint: `/api/boards/:boardId/frames/:frameId` (DELETE)
- Frame create endpoint: `/api/boards/:boardId/frames` (POST)

## Summary

**What:** Frame count shows 8 in sidebar, 6 in main area  
**Why:** Backend `frameCount` metadata is stale, not updated when frames are deleted  
**Impact:** Confusing UI, inaccurate board list, but doesn't break functionality  
**Fix:** Update backend to maintain `frameCount` on frame CRUD operations  
**Priority:** Medium (UX issue, not breaking)

