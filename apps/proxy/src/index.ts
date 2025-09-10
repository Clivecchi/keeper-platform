import express, { Request, Response, NextFunction } from "express";
import { requireProxyKey } from "./middleware/auth";
import { createCorsMiddleware } from "./middleware/cors";
import { createRateLimiterMiddleware } from "./middleware/ratelimit";
import { httpGetJson } from "./http";
import { initProxyTopics, insertProxyTopic, listProxyTopics } from "./db";
import crypto from "node:crypto";

// Environment configuration and validation
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const KAM_SERVICE_KEY = String(process.env.KAM_SERVICE_KEY || "dev-kam-key");
const KEEPER_API_BASE = String(process.env.KEEPER_API_BASE || "https://keeper-platform-production.up.railway.app");
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const app = express();
app.set("trust proxy", true);
app.use(express.json());

// Middlewares (CORS global; health is public; rate limit after health)
app.use(createCorsMiddleware(CORS_ORIGINS));
// Public healthz
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});
// Rate limiter (does not affect /healthz because mounted after)
app.use(createRateLimiterMiddleware({
  tokensPerSecond: 5,
  bucketCapacity: 5,
  keySelector: (req) => req.headers["authorization"]?.toString() || "anonymous",
}));
// Protect only /v1 routes
app.use("/v1", requireProxyKey);

// Initialize ephemeral DB objects lazily on first /v1 request
app.use("/v1", async (_req: Request, _res: Response, next: NextFunction) => {
  try {
    await initProxyTopics();
    next();
  } catch (e) {
    next(e);
  }
});

// Helpers to build upstream URLs
const withBase = (path: string) => `${KEEPER_API_BASE}${path}`;

// GET /v1/agents/:agentId/home -> proxy to /api/board-data/agents/:agentId/home
app.get("/v1/agents/:agentId/home", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { agentId } = req.params as { agentId: string };
    const upstreamUrl = withBase(`/api/board-data/agents/${encodeURIComponent(agentId)}/home`);

    // Pass through user JWT if present in x-user-authorization or x-user-token, else use service key
    const userAuthHeader =
      (req.headers["x-user-authorization"] as string | undefined) ||
      (req.headers["x-user-token"] as string | undefined);

    const upstreamAuthorization = userAuthHeader && userAuthHeader.length > 0
      ? userAuthHeader
      : `Bearer ${KAM_SERVICE_KEY}`;

    const data = await httpGetJson(upstreamUrl, {
      Authorization: upstreamAuthorization,
    });

    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// GET /v1/boards/:boardId/frames -> proxy to /kam/boards/:boardId/frames
app.get("/v1/boards/:boardId/frames", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { boardId } = req.params as { boardId: string };
    const upstreamUrl = withBase(`/kam/boards/${encodeURIComponent(boardId)}/frames`);
    const data = await httpGetJson(upstreamUrl, {
      Authorization: `Bearer ${KAM_SERVICE_KEY}`,
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// GET /v1/frames/:frameId/config -> proxy to /kam/frames/:frameId/config
app.get("/v1/frames/:frameId/config", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { frameId } = req.params as { frameId: string };
    const upstreamUrl = withBase(`/kam/frames/${encodeURIComponent(frameId)}/config`);
    const data = await httpGetJson(upstreamUrl, {
      Authorization: `Bearer ${KAM_SERVICE_KEY}`,
    });
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
});

// ----------------------------------------------------------------------------
// TEMP: /v1/topics - minimal Topics API until migration to KAM
// TEMP: migrate to KAM by 2025-10-01
// ----------------------------------------------------------------------------
app.get("/v1/topics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number.parseInt(String(req.query.limit ?? "25"), 10);
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const verbose = String(req.query.verbose || "false").toLowerCase() === "true";
    const rows = await listProxyTopics({ limit: Number.isFinite(limit) ? limit : 25, q, verbose });
    const mini = rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, area: r.area, status: r.status, createdAt: r.created_at }));
    const payload = verbose ? rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      area: r.area,
      status: r.status,
      notesJson: r.notes_json,
      actionsJson: r.actions_json,
      createdAt: r.created_at,
    })) : mini;
    res.status(200).json({ items: payload });
  } catch (error) {
    next(error);
  }
});

app.post("/v1/topics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<{ slug: string; title: string; area: string; status?: string; notes?: unknown; actions?: unknown }>;
    const slug = String(body.slug || "").trim();
    const title = String(body.title || "").trim();
    const area = String(body.area || "").trim();
    const status = String(body.status || "draft").trim();
    if (!slug || !title || !area) {
      return res.status(400).json({ error: "Missing required fields: slug, title, area" });
    }
    if (!/^[-a-z0-9]+$/.test(slug)) {
      return res.status(400).json({ error: "Invalid slug format" });
    }
    const id = crypto.randomUUID();
    const notesJson = JSON.stringify(body.notes ?? []);
    const actionsJson = JSON.stringify(body.actions ?? []);
    const row = await insertProxyTopic({ id, slug, title, area, status, notes_json: notesJson, actions_json: actionsJson });
    res.status(201).json({ id: row.id, slug: row.slug, title: row.title, area: row.area, status: row.status, createdAt: row.created_at });
  } catch (error: any) {
    if (error && typeof error === "object" && String(error.message || "").includes("duplicate key value violates unique constraint")) {
      return res.status(409).json({ error: "Topic slug already exists" });
    }
    next(error);
  }
});

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(502).json({ error: "Upstream error" });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy listening on port ${port} (env: ${process.env.NODE_ENV || "dev"})`);
});


