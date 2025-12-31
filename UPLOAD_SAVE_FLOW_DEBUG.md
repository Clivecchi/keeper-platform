# Upload Save Flow Debug - November 9, 2025

## Problem
Image uploads successfully to Vercel Blob, but the URL is not saved to the database.

## Investigation Results

### Database State
```json
{
  "id": "hero-cover-image",
  "type": "image",
  "config": {
    "name": "...",
    "variant": "...",
    "dataSource": "..."
    // ❌ Missing "url" field!
  },
  "value": null
}
```

### Code Flow (Verified Working)
1. ✅ MediaUploader returns `{ type: 'image', url: 'https://...blob.vercel-storage.com/...' }`
2. ✅ ImagePropEditor calls `onChange({ url: media.url })`  
3. ✅ PropManager updates `editingConfig` with new URL
4. ✅ User clicks "Save Changes" → PropManager.handleSaveEdit()
5. ✅ PropManager calls `onPropsUpdate(frameId, updatedProps)`
6. ✅ DomainBoardRenderer.handleFrameUpdate() collects changes
7. ✅ PublicDomainPage.handleBoardUpdate() stores changes
8. ✅ User clicks "Save Changes" (top-level) → handleSaveChanges()
9. ✅ Sends PUT to `/api/domains/${domainId}/board-data`

## Root Cause Hypothesis

**User didn't click "Save Changes" after upload** (most likely)

When you upload an image in edit mode:
1. Image uploads to Vercel Blob ✅
2. "Image uploaded" appears ✅  
3. **You must click prop's "Save Changes" button** ❌ (Did you?)
4. **Then click board's "Save Changes" button** ❌ (Did you?)

## The Two Save Buttons

### 1. Prop-Level Save (Inside Editor)
After uploading image, the ImagePropEditor shows "Save Changes" button.
This saves the URL to the prop's config **in memory only**.

### 2. Board-Level Save (Top Right)
After making any changes, the top-right shows "Save Changes" button.
This persists all changes to the database.

**Both must be clicked** to persist uploaded images!

## Alternative Theory

If you DID click both save buttons, then the issue might be:
- The save payload is malformed
- The API endpoint isn't updating props correctly
- There's a serialization issue

## Next Steps

### To Test: Add Debug Logging

**apps/web/src/pages/d/PublicDomainPage.tsx** (line 180):
```typescript
const handleBoardUpdate = async (changes: any) => {
  console.log('[PublicDomainPage] Board update received:', JSON.stringify(changes, null, 2));
  setBoardChanges(changes);
  setHasUnsavedChanges(true);
};
```

**apps/web/src/pages/d/PublicDomainPage.tsx** (line 146):
```typescript
const handleSaveChanges = async () => {
  if (!boardChanges || !domainId) {
    console.warn('No changes to save');
    return;
  }

  console.log('[PublicDomainPage] Saving board changes:', JSON.stringify(boardChanges, null, 2));
  
  setIsSaving(true);
  try {
    // ... rest of save logic
  }
}
```

### To Verify User Workflow

1. Go to Board Studio
2. Click "Edit" button (if not already in edit mode)
3. Click on the Cover frame image
4. Upload an image
5. Wait for "Image uploaded" confirmation
6. **Click "Save Changes" in the image editor panel** ← Critical!
7. Image editor closes
8. **Click "Save Changes" button at top-right** ← Critical!
9. Wait for "Board saved successfully" message
10. Navigate to `/d/default`
11. Image should display

## Quick Fix - Try This First

**Go back to Board Studio and:**
1. Select the Cover frame
2. Upload the image again
3. **Make sure to click "Save Changes" inside the editor**
4. **Then click "Save Changes" at the top-right**
5. Verify you see "Board saved successfully" in console
6. Then check `/d/default` again

The image might be uploaded but not saved because one of the save buttons wasn't clicked!


