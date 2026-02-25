# Debug: www.ke3p.com Public Visitor Flow

## Code flow trace (as of 2026-02-24)

### 1. Initial request: www.ke3p.com/

| Step | Component | What happens |
|------|-----------|--------------|
| 1 | App.tsx | Route `path="/"` matches under `PublicLayout` |
| 2 | RootRedirect | Renders `<Navigate to="/d/default/board?frame=commons" replace />` |
| 3 | Browser | URL changes to `www.ke3p.com/d/default/board?frame=commons` |

### 2. Second route: /d/default/board?frame=commons

| Step | Component | What happens |
|------|-----------|--------------|
| 4 | App.tsx | Route `path="/d/:slug/board"` matches under `BoardPublicLayout` |
| 5 | V0ShellPage | Renders `V0Shell` |
| 6 | V0Shell | `slug="default"`, `frameParam="commons"` from URL |
| 7 | useAuth | `isAuthenticated` = false (after /auth/me returns 401 for anon) |
| 8 | useExperienceMode | `resolveFrame("commons", false)` → **"cover"** (commons is private) |
| 9 | V0Shell | Renders `CoverFrame` (frame resolved to cover) |
| 10 | useEffect (L114-117) | `!isAuthenticated && isPrivateRequest` → `navigate(buildFrameUrl("cover"))` |
| 11 | Browser | **Second navigation** to `www.ke3p.com/d/default/board?frame=cover&style=neutral` |

### 3. Why it "loads twice" or "loads then forwards"

**Root cause:** Two sequential redirects:

1. **RootRedirect** sends everyone to `?frame=commons`
2. **V0Shell** sees `frame=commons` but user is unauthenticated → redirects to `?frame=cover`

Public visitors never get to see commons (it's private), so they are always redirected. The URL briefly shows `frame=commons` before changing to `frame=cover`.

### 4. Domain data flow

| Step | Location | What happens |
|------|----------|--------------|
| 12 | V0Shell useEffect (L76-96) | `setDomainData(getDomainFallback(slug))` **immediately** – fallback has **no theme** |
| 13 | V0Shell | Async `apiFetch(/api/domains/by-slug/default)` |
| 14 | API | Returns `{ theme: { coverImage: "https://...blob.vercel-storage.com/..." } }` |
| 15 | V0Shell | `setDomainData(response)` – now has `theme.coverImage` |
| 16 | CoverFrame | Receives `domainData` with `theme.coverImage` |

### 5. Cover background image flow

| Step | Location | What happens |
|------|----------|--------------|
| 17 | CoverFrame L77-78 | `coverImageUrl = domainData?.theme?.coverImage` |
| 18 | CoverFrame L78 | `displayUrl = getBlobProxyUrl(coverImageUrl)` |
| 19 | blobProxy.ts | On www.ke3p.com: returns **relative** `/api/uploads/proxy?url=...` |
| 20 | CoverFrame L81 | `backgroundImage: url(/api/uploads/proxy?url=...)` |
| 21 | Browser | Requests `www.ke3p.com/api/uploads/proxy?url=...` → Vercel rewrites to Railway |
| 22 | API proxy | Fetches blob from Vercel Blob → **returns 500** |
| 23 | Result | Image fails to load → no background visible |

### 6. Why the domain image does not show

**Root cause:** The upload proxy (`/api/uploads/proxy`) returns **500 Internal Server Error** when fetching the cover image from Vercel Blob. The blobProxy always routes blob URLs through the proxy; for public blobs the proxy is unnecessary and is failing.

**Fix:** Use the direct blob URL for public blobs (`*.public.blob.vercel-storage.com`). They are publicly readable and do not require the proxy.

---

## Summary of fixes

1. **Double load:** Change `RootRedirect` to target `/d/default/board` without `frame=commons`, so `defaultFrame` applies (cover for anon, commons for auth). Avoids the second redirect.
2. **Domain image:** In `blobProxy.ts`, return the raw URL for public blobs instead of proxying them.
