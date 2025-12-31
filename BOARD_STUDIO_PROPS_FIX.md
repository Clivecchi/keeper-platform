# Board Studio Props Fix

**Date:** October 27, 2025  
**Status:** ✅ Complete

## The Problem

The Props Library onClick handlers were calling `handleAddFrameToBoard()`, which created **NEW FRAMES** instead of adding **PROPS TO EXISTING FRAMES**. This is why you saw multiple "Quote" frames when clicking on props - each click created a new frame!

## The Solution

### 1. Created `handleAddPropToFrame()` Function

Added a new function that properly adds props to the currently selected frame:

```typescript
const handleAddPropToFrame = async (propType: string, propConfig: Record<string, any>) => {
  // Validates selectedFrameId and selectedBoardId
  // Creates a new prop with unique ID
  // Updates frame via PATCH /api/board-data/:boardId/frames/:frameId
  // Updates local state to show prop immediately
}
```

### 2. Updated All Props Library onClick Handlers

Changed **9 onClick handlers** from creating frames to adding props:

**Before:**
```javascript
onClick={() => handleAddFrameToBoard({ id: 'hero-image', name: 'Hero Image', ... })}
```

**After:**
```javascript
onClick={() => handleAddPropToFrame('image', { url: '', alt: 'Hero image', ... })}
```

### Props Updated:
- ✅ Hero Image → adds `image` prop
- ✅ Video Player → adds `media` prop
- ✅ Image Gallery → adds `gallery` prop
- ✅ Heading → adds `heading` prop
- ✅ Text Block → adds `text` prop
- ✅ Quote → adds `quote` prop
- ✅ Action Button → adds `button` prop
- ✅ Form → adds `form` prop
- ✅ AI Assistant & related → adds `ai-assistant` prop

### 3. Fixed PatternRenderer Mode

Changed both PatternRenderer calls to always use `mode="preview"`:

**Before:**
```typescript
mode={editorMode}  // Was 'edit', 'layout', 'preview', or 'assist'
```

**After:**
```typescript
mode="preview"  // Always renders actual content
```

## What You Should See Now

### Expected Behavior (After Refresh)

1. **Edit Mode - Canvas Shows Rendered Content:**
   ```
   ┌────────────────────────────────────────────┐
   │  Quote                                     │
   │  AI conversation interface                 │
   │                                            │
   │  🤖 Hello! I'm here to help...            │
   │                                            │
   │       Can you help me understand...       │
   │                                            │
   │  🤖 Of course! This is a dialogic...      │
   │                                            │
   │  [Type your message...]  [Send]           │
   └────────────────────────────────────────────┘
   ```

2. **Props Library - Clicking Adds Props (NOT Frames):**
   - Select a frame (e.g., "Quote")
   - Click "Heading" in Props Library
   - **Result:** Heading prop appears INSIDE the Quote frame
   - **NOT:** A new "Heading" frame is created

3. **Console Logs:**
   ```
   Adding prop to frame: { propType: 'heading', propConfig: {...}, frameId: '...' }
   Updating frame props: { frameId: '...', updatedProps: {...} }
   ✅ Prop added successfully
   ```

## How to Use

### Adding Props to a Frame

1. **Select a Frame:**
   - Click on a frame tab at the top (e.g., "Quote", "Heading", etc.)
   - The frame will be displayed in the canvas

2. **Add Props:**
   - Scroll through Props Library on the right
   - Click any prop (e.g., "Heading", "Text Block", "AI Assistant")
   - The prop will immediately appear inside the selected frame

3. **See the Result:**
   - Props render immediately in Edit mode
   - No need to switch to Preview mode
   - Props persist automatically to the backend

### What if No Frame is Selected?

You'll see an alert: "Please select a frame first"

### Multiple Props in One Frame

You can add multiple props to the same frame:
- Select "Quote" frame
- Click "Heading" → Heading appears
- Click "Text Block" → Text block appears below heading
- Click "AI Assistant" → AI widget appears below text

All props stack vertically in the frame.

## Files Modified

**`apps/web/src/pages/studio/board-studio-page.tsx`:**
- Added `handleAddPropToFrame()` function (lines 1366-1424)
- Updated 9 onClick handlers in Props Library section (lines 2183-2498)
- Changed both PatternRenderer `mode` props to `"preview"` (lines 1857, 1933)

## Testing Checklist

- [ ] Refresh the browser
- [ ] Select a frame (e.g., "Quote")
- [ ] Click a prop from Props Library (e.g., "Heading")
- [ ] Verify a prop appears in the frame (NOT a new frame in tabs)
- [ ] Add multiple props to the same frame
- [ ] Verify props persist after page refresh
- [ ] Check console for "✅ Prop added successfully"

## Known Remaining Issues

1. **"Configure" Dropdown Does Nothing:**
   - The gear icon next to frames has a "Configure" option
   - This needs to be wired up to open a config panel
   - Workaround: Props Library is the main way to add content for now

2. **No Per-Prop Editing:**
   - Once a prop is added, you can't edit its individual config yet
   - Future enhancement needed

3. **No Drag-and-Drop:**
   - Props have drag handlers but dropping doesn't work
   - onClick is the working method

## Next Steps

If this fixes the issue, next priorities are:
1. Wire up "Configure" dropdown to actually configure frames
2. Add per-prop editing capability
3. Enable drag-and-drop for props (currently only onClick works)
4. Add visual feedback when hovering over Props Library items

---

**Summary:** Props Library now correctly adds props to frames instead of creating new frames. The fix involves a new `handleAddPropToFrame()` function and updated onClick handlers for all 9 prop types.

