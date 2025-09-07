import express, { Request, Response, NextFunction } from "express";
import { createProxyAuthMiddleware } from "./middleware/auth";
import { createCorsMiddleware } from "./middleware/cors";
import { createRateLimiterMiddleware } from "./middleware/ratelimit";
import { httpGetJson } from "./http";

// Environment configuration and validation
const PORT = Number(process.env.PORT || 8080);
const NODE_ENV = process.env.NODE_ENV || "production";
const PROXY_API_KEY = String(process.env.PROXY_API_KEY || "dev-proxy-key");
const KAM_SERVICE_KEY = String(process.env.KAM_SERVICE_KEY || "dev-kam-key");
const KEEPER_API_BASE = String(process.env.KEEPER_API_BASE || "https://keeper-platform-production.up.railway.app");
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const app = express();
app.set("trust proxy", true);

// Middlewares
app.use(createCorsMiddleware(CORS_ORIGINS));
app.use(createRateLimiterMiddleware({
  tokensPerSecond: 5,
  bucketCapacity: 5,
  keySelector: (req) => req.headers["authorization"]?.toString() || "anonymous",
}));
app.use(createProxyAuthMiddleware(PROXY_API_KEY));

// Health check
app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
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

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(502).json({ error: "Upstream error" });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Proxy listening on port ${PORT} (env: ${NODE_ENV})`);
});


