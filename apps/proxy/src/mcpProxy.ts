import express, { Request, Response } from "express";
import fetch from "node-fetch";

const router = express.Router();
const BASE = process.env.KEEPER_API_BASE!;

// CORS for MCP routes
router.use((req, res, next) => {
  const origin = (req.headers.origin as string) || "";
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-domain-id");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Accept both auth styles and normalize
function extractApiKey(req: Request) {
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return (req.header("x-api-key") || bearer || "").trim();
}

// ---- Base probes (some UIs call these first) ----
router.get("/", (_req, res) =>
  res.status(200).json({ ok: true, service: "keeper-mcp-proxy" })
);
router.head("/", (_req, res) => res.sendStatus(200));
router.head("/schema", (_req, res) => res.sendStatus(200));
router.head("/call", (_req, res) => res.sendStatus(200));
// -------------------------------------------------

router.get("/schema", async (req: Request, res: Response) => {
  const key = extractApiKey(req);
  const r = await fetch(`${BASE}/api/mcp/schema`, {
    headers: {
      "x-api-key": key,
      "authorization": `Bearer ${key}`
    }
  });
  const src = await r.json(); // current shape: { service, version, tools:[ { name, description, parameters } ] }

  // Transform to MCP v1
  const mcpSchema = {
    mcp: { version: "1.0" },
    server: { name: { human_readable: src.service || "keeper-mcp" }, version: String(src.version || "0.0.1") },
    tools: (src.tools || []).map((t: any) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters || { type: "object", properties: {} }, // MCP requires "input_schema"
    })),
  };

  res
    .status(200)
    .set("Content-Type", "application/json; charset=utf-8")
    .json(mcpSchema);
});

router.post("/call", async (req: Request, res: Response) => {
  const key = extractApiKey(req);
  const r = await fetch(`${BASE}/api/mcp/call`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "authorization": `Bearer ${key}`
    },
    body: JSON.stringify(req.body || {})
  });
  const body = await r.text();
  res.status(r.status)
    .set("Content-Type", r.headers.get("content-type") || "application/json; charset=utf-8")
    .send(body);
});

export default router;

