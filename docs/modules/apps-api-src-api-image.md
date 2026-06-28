# image

## 📌 Purpose
Image generation subagent endpoint. Receives a creative brief, assembles a FLUX prompt, and calls `ModelProviderService.generateImage()` via Together AI (FLUX model family). Returns a hosted image URL.

## 🧱 Key Files
- `routes.ts` — `POST /api/image/generate` — the only endpoint in this module

## 🔄 Data & Behavior
**Request body (validated via Zod):**
- `subject` (required) — what the image depicts
- `mood` (optional) — emotional tone
- `style` (optional) — visual aesthetic
- `aspect_ratio` (optional) — `1:1` | `16:9` | `9:16` | `4:3`, defaults to `1:1`
- `model` (optional) — FLUX model ID override, defaults to `black-forest-labs/FLUX.1-schnell`
- `domain_context` (optional) — the `image_style` hint from domain JSON, folded into the prompt as a trailing style anchor

**Prompt assembly:** `subject, mood, style, domain_context` — comma-joined. Sent as the `prompt` field to FLUX.

**Aspect ratio → dimensions map:** `1:1 → 1024×1024`, `16:9 → 1344×768`, `9:16 → 768×1344`, `4:3 → 1024×768`.

**Auth:** `authMiddlewareCompat` — same as uploads. Returns 401 if no valid JWT.

**Rate limit:** 10 requests/minute/IP (stricter than companion at 20 — image generation is expensive).

**Key resolution:** Delegates to `ModelProviderService.generateImage(brief, userId)`. Key priority: `TOGETHER_API_KEY` env var → user key (DB) → platform key (DB).

## ⚠️ Notes & ToDo
- [ ] Step 4 will add `image.generate` to Kip's action schema so Kip can dispatch here from a Moment or Journey context
- [ ] Upload-to-Moment path is not wired — generated URLs are returned only. Attaching to a Moment requires wiring `MomentBody.tsx` upload button (noted as a gap in diagnostics)
- [ ] Pool Keeper domain-specific `image_style` / `image_model` values are configured at the DB level per domain, not in this file

## 📆 Update Log

### 2026-06-28 — Together SDK + model resolution
- `ModelProviderService.generateImage` now uses the official `together-ai` SDK (`client.images.generate`) with 3 automatic retries and a 120s timeout — replaces raw fetch that failed on transient Together 500s.
- `resolveImageModel()` rejects unsupported free-tier model IDs and falls back to `black-forest-labs/FLUX.1-schnell`.

### 2026-03-08 — Initial creation (Step 3 of image generation build)
- Created `routes.ts` with `POST /api/image/generate`
- Registered at `/api/image` in `apps/api/src/index.ts`
- `assembleFLUXPrompt()` performs server-side prompt assembly from brief fields
- `ASPECT_RATIO_MAP` maps four ratios to pixel dimensions
- Auth via `authMiddlewareCompat`, rate-limited at 10/min/IP
