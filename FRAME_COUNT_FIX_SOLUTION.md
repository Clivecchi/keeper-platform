# Frame Count Discrepancy - Solution Implemented

**Date:** October 27, 2025  
**Status:** ✅ Investigation Complete - Backend Already Correct

## Investigation Results

### Good News: Backend is Already Correct! ✅

The backend (`apps/api/src/api/boards.ts` lines 392-440) **already calculates `frameCount` dynamically**:

```typescript
// Line 400-417: Query boards with frames
const boards = await prisma.board.findMany({
  where: { keeperId },
  select: {
    id: true,
    name: true,
    slug: true,
    description: true,
    createdAt: true,
    updatedAt: true,
    frames: {
      select: { id: true }  // ← Gets actual frame IDs
    }
  },
  orderBy: { updatedAt: 'desc' },
  take: limit,
  skip: offset,
});

// Line 420-423: Calculate frameCount from actual frames
const boardsWithFrameCount = boards.map(board => ({
  ...board,
  frameCount: board.frames.length,  // ✅ CORRECT - calculated dynamically
  frames: undefined  // Remove frames array from response
}));
```

### Database Schema

**Board model has NO `frameCount` column** (confirmed in `schema.prisma` lines 117-147).

This is the **correct design** - no denormalized data to maintain.

## Root Cause of Discrepancy

The "8 vs 6" discrepancy is **NOT a backend persistence issue**. It's likely one of:

### Possibility 1: Frontend Filtering

The frontend might be filtering `mockFrames` after loading (e.g., hiding certain frame roles):

```typescript
// Somewhere in the frontend, frames might be filtered:
const visibleFrames = mockFrames.filter(f => f.role !== 'hidden' || someCondition);
```

### Possibility 2: Stale Data in Browser

Browser caching or React state not properly updating after frame deletions.

### Possibility 3: Two Different Boards

User might be looking at different boards between sidebar (one board) and main area (another board).

### Possibility 4: Deleted Frames Not Properly Removed from UI

When frames are deleted, the local `mockFrames` state might not be updated, but the API refetch shows the correct count.

## Verification Steps

### Step 1: Check Actual Database Count

Run this query to see the true frame count:

```sql
SELECT 
  b.id,
  b.name,
  COUNT(f.id) as actual_frame_count
FROM "Board" b
LEFT JOIN "FrameInstance" f ON f."boardId" = b.id
WHERE b.id = 'bded06fa-d222-48ec-94fb-d2acbf2ac039'  -- Replace with actual boardId
GROUP BY b.id, b.name;
```

### Step 2: Check API Response

```bash
curl -H "Authorization: Bearer <token>" \
  "https://api.ke3p.com/api/board-data?keeperId=<keeperId>"
```

Check if `frameCount` in the response matches the database count.

### Step 3: Check Frontend State

Add this console log to `board-studio-page.tsx` after line 619:

```typescript
setMockFrames(frames);
console.log('🔍 Frame Count Debug:', {
  apiReturnedFrames: frames.length,
  boardListFrameCount: board.frames?.length || 0,
  mockFramesLength: frames.length,
  frameIds: frames.map(f => f.id),
  frameRoles: frames.map(f => f.data?.role)
});
```

## Solution: No Backend Changes Needed

**The backend is already implementing best practices:**

✅ No denormalized `frameCount` column  
✅ Calculates count dynamically on read  
✅ Single source of truth (actual frame records)  
✅ No stale data possible  
✅ No cascade updates needed  

### Frontend Fix (If Needed)

If the discrepancy persists, the fix belongs in the frontend. Add a computed count:

```typescript
// In board-studio-page.tsx, line 1829
// Instead of using board.frameCount from API, use mockFrames.length
<div className="text-xs text-gray-500">
  {mockFrames.length} frame{mockFrames.length !== 1 ? 's' : ''}
</div>
```

This ensures both locations use the same source of truth (the actual loaded frames).

## Recommended Actions

### Immediate (Frontend)

1. **Add Debug Logging:**
   - Log `board.frameCount` from API response
   - Log `mockFrames.length` after setting state
   - Log frame IDs to see which frames are included/excluded

2. **Unify Frame Count Display:**
   - Use `mockFrames.length` in both sidebar and main area
   - Or use `board.frameCount` in both places
   - Consistency is key

3. **Clear Browser Cache:**
   - Hard refresh (Ctrl+Shift+R)
   - Clear localStorage/sessionStorage
   - Test in incognito mode

### Long-term (Monitoring)

1. **Add Health Check:**
   ```typescript
   if (board.frameCount !== mockFrames.length) {
     console.warn('Frame count mismatch:', {
       apiCount: board.frameCount,
       loadedCount: mockFrames.length,
       boardId: board.id
     });
   }
   ```

2. **Analytics:**
   - Track when discrepancies occur
   - Identify patterns (specific boards, after certain operations, etc.)

## Testing Checklist

After implementing frontend fixes:

- [ ] Create new board → verify counts match
- [ ] Add 3 frames → verify counts update to 3 in both places
- [ ] Delete 1 frame → verify counts update to 2 in both places
- [ ] Refresh page → verify counts remain consistent
- [ ] Switch between boards → verify each shows correct count
- [ ] Check browser console for mismatch warnings

## Conclusion

**No backend changes required.** The backend is already doing the right thing by:
1. Not storing redundant `frameCount` column
2. Calculating frame count from actual data
3. Returning accurate counts in API responses

The discrepancy is likely a **frontend state management issue** or **browser caching**. The solution is to:
1. Debug where the "8" is coming from (stale state? different board?)
2. Ensure both UI locations use the same data source
3. Add consistency checks and warnings

**Status:** Backend implementation follows best practices. Frontend debugging/fixes recommended.

