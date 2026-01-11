# Vercel Configuration

## SPA Fallback Rewrite

**IMPORTANT: Do not remove the following rewrite rule from `vercel.json`:**

```json
{ "source": "/(.*)", "destination": "/index.html" }
```

### Purpose
This rewrite is required for Single Page Application (SPA) deep-linking support. It ensures that routes like `/v0`, `/d/default`, and other client-side routes serve the main `index.html` file instead of returning 404 errors.

### What it does
- Routes like `/v0` or `/d/my-domain` are rewritten to serve `/index.html`
- React Router then handles the client-side routing
- Static assets (`/assets/*`) and API routes (`/api/*`) are served normally (not affected by this rule)

### Why it's needed
- Vercel serves static files by default
- Direct navigation to SPA routes (e.g., refreshing `/v0`) would return 404 without this rewrite
- The rewrite ensures consistent SPA behavior on refresh or direct navigation

### What happens if removed
- Routes like `https://www.ke3p.com/v0` will return 404 Not Found
- SPA deep-linking will break
- Users won't be able to refresh pages or share direct links to app routes

### Alternatives
If this rewrite is removed, replace it with an equivalent SPA routing strategy (e.g., Vercel's `routes` configuration with `handle: filesystem` + catch-all).

## Configuration Location
- **File**: `vercel.json` (repository root)
- **Applies to**: Frontend build in `apps/web/`
- **Output directory**: `apps/web/dist/`

## Related Files
- Build output: `apps/web/dist/index.html`
- Static assets: `apps/web/dist/assets/`
- Build command: `cd apps/web && pnpm build`