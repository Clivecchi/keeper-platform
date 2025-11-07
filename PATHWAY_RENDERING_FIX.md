# Pathway Frame Rendering Fix

## Issue
The Pathway navigation component was not rendering on domain pages (e.g., `www.ke3p.com/d/default`). Instead, the user menu button was floating in the top-right corner with no navigation bar visible.

## Root Cause
The `DomainBoardRenderer` component was treating ALL frames the same way - rendering them as content sections in the main area. However, **Pathway frames need special handling** as they represent page navigation, not content.

### Before:
```tsx
// All frames rendered the same way as content sections
<div className="space-y-8">
  {visibleFrames.map(frame => (
    <FrameRenderer frame={frame} />  // Pathway rendered as content!
  ))}
</div>
```

### After:
```tsx
// Pathway frames separated and rendered as navigation
{pathwayFrame && (
  <PathwayRenderer frame={pathwayFrame} />  // Renders as nav bar
)}

<div className="space-y-8">
  {contentFrames.map(frame => (
    <FrameRenderer frame={frame} />  // Only content frames
  ))}
</div>
```

## Changes Made

### 1. Updated `DomainBoardRenderer.tsx`

**Added PathwayNav import:**
```tsx
import { PathwayNav } from '../patterns/PathwayNav';
```

**Separated Pathway from content frames:**
```tsx
// Separate Pathway frames from content frames
const pathwayFrame = visibleFrames.find((frame) => 
  frame.pattern === 'pathway' || frame.name.toLowerCase().includes('pathway')
);
const contentFrames = visibleFrames.filter((frame) => 
  frame.pattern !== 'pathway' && !frame.name.toLowerCase().includes('pathway')
);
```

**Render Pathway separately:**
```tsx
{/* Render Pathway navigation if exists */}
{pathwayFrame && (
  <PathwayRenderer 
    frame={pathwayFrame} 
    domain={domain}
  />
)}

{/* Render content frames */}
<div className="w-full max-w-7xl mx-auto p-6">
  <div className="space-y-8">
    {contentFrames.map((frame) => (
      <FrameRenderer ... />
    ))}
  </div>
</div>
```

### 2. Created `PathwayRenderer` Component

A new helper component that:
- Extracts pathway configuration from frame props
- Converts frame props to `PathwayNav` format
- Renders the `PathwayNav` component with proper props

```tsx
function PathwayRenderer({ frame, domain }: PathwayRendererProps) {
  // Extract pathway configuration from props
  const pathwayConfig = frame.props.find(p => p.type === 'pathway-config')?.config || {};
  
  // Extract path items from props
  const pathProps = frame.props.filter(p => p.type === 'pathway-item' || p.type === 'link');
  
  // Convert props to pathway items format
  const paths = pathProps
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(prop => ({
      label: prop.config.label || prop.config.text || 'Link',
      href: prop.config.href || prop.config.url || '#',
      description: prop.config.description || prop.config.label,
      variant: prop.config.variant || 'system',
      analyticsId: prop.config.analyticsId
    }));

  return (
    <PathwayNav
      layout={pathwayConfig.layout || 'inline'}
      orientation={pathwayConfig.orientation || 'horizontal'}
      paths={paths}
      // ... other props
    />
  );
}
```

## Expected Behavior After Deploy

### On Public Domain Pages (`/d/default`)

**Before Fix:**
- User button floating top-right
- No navigation bar visible
- Content frames start immediately below

**After Fix:**
- User button in top-right
- **Pathway navigation bar displayed** (e.g., "Sign In", "Get Started")
- Content frames below navigation
- Proper visual hierarchy

### Layout Options

The Pathway can render in different layouts based on configuration:

1. **Inline (horizontal)** - Default
   ```
   [Sign In] [Get Started]
   ```

2. **Edge (vertical tabs)** - Bookmark-style on page edge
   ```
   |S|   (Sign In - vertical ribbon)
   |i|
   |g|
   |n|
   ```

## Verification Steps

After deploying, verify on `www.ke3p.com/d/default`:

1. ✅ Pathway navigation is visible above content
2. ✅ Navigation items show for public users ("Sign In", "Get Started")
3. ✅ Navigation items show for authenticated users (if configured)
4. ✅ Content frames (Cover, Article) render below navigation
5. ✅ No layout shifts or floating elements

## Debug Info

In development mode, debug info will show:
```
Board: Keeper | Total Frames: 3 | Visible: 3 | Pathway: Yes | Role: viewer | Is Admin: No
```

The **"Pathway: Yes"** confirms a Pathway frame was detected and rendered.

## Related Components

- `apps/web/src/components/domain/DomainBoardRenderer.tsx` - Main renderer
- `apps/web/src/components/patterns/PathwayNav.tsx` - Navigation component
- `apps/web/src/components/patterns/types.ts` - Type definitions

## Testing Recommendations

1. **Test as public user** (not logged in)
   - Should see public paths (Sign In, Get Started)
   
2. **Test as authenticated user**
   - Should see authed paths (if configured)
   
3. **Test different layouts**
   - Inline (horizontal pills)
   - Edge (vertical tabs on right/left)
   
4. **Test on mobile**
   - Ensure responsive behavior
   - Navigation should adapt to smaller screens

## Future Enhancements

- [ ] Add pathway editor in Board Studio
- [ ] Support for dynamic path generation based on domain data
- [ ] Analytics tracking for pathway clicks
- [ ] A/B testing for different pathway layouts
- [ ] Path authorization rules (show certain paths only to specific roles)

## Notes

- Pathway frames are identified by `pattern === 'pathway'` or name containing "pathway"
- If no Pathway frame exists, content renders normally (no navigation bar)
- If Pathway has no props/paths, it won't render (graceful fallback)
- The fix is backward compatible - existing boards without Pathway continue to work

## Rollback Plan

If issues occur, revert the changes to `DomainBoardRenderer.tsx`:

```bash
git revert [commit-hash]
git push origin main
```

The previous behavior (all frames as content) will be restored.

