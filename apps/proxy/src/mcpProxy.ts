import express, { Request, Response } from "express";
import fetch from "node-fetch";

const router = express.Router();
const BASE = process.env.KEEPER_API_BASE!;

// ============================================================================
// Minimal JSON Schema Normalizer for MCP v1 Compliance
// ============================================================================

function isPlainObj(x: any): x is Record<string, any> {
  return !!x && typeof x === "object" && !Array.isArray(x);
}

function normalizeRootSchema(input: any) {
  const out: any = isPlainObj(input) ? { ...input } : {};
  out.type = "object"; // enforce object schema

  // ensure properties is a plain object (never null/array/string)
  out.properties = isPlainObj(input?.properties) ? { ...input.properties } : {};

  // keep required as string[]
  out.required = Array.isArray(input?.required)
    ? input.required.filter((s: any) => typeof s === "string")
    : [];

  // additionalProperties must be boolean if present; else default false
  out.additionalProperties =
    typeof input?.additionalProperties === "boolean"
      ? input.additionalProperties
      : false;

  return out;
}

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
  const upstream = await r.json(); // current shape: { service, version, tools:[ { name, description, parameters } ] }

  // Transform to MCP v1
  const tools = (upstream.tools || []).map((t: any) => ({
    name: t.name,
    description: t.description,
    input_schema: normalizeRootSchema(t.parameters),
  }));

  // Dev-only debug: verify properties shape
  console.log("[mcp/schema] properties types:", tools.map(t => [t.name, typeof t.input_schema?.properties]));

  res
    .status(200)
    .set("Content-Type", "application/json; charset=utf-8")
    .json({
      mcp: { version: "1.0" },
      server: { 
        name: { human_readable: upstream.service || "keeper-mcp" }, 
        version: String(upstream.version || "0.0.1") 
      },
      tools,
    });
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

// Debug route: expose schema in dev (no auth required)
if (process.env.NODE_ENV !== "production") {
  router.get("/__debug/mcp-schema", async (_req: Request, res: Response) => {
    try {
      // Use a default dev key or fetch without auth for debugging
      const r = await fetch(`${BASE}/api/mcp/schema`, {
        headers: {
          "x-api-key": process.env.MCP_DEBUG_KEY || "debug-key",
          "authorization": `Bearer ${process.env.MCP_DEBUG_KEY || "debug-key"}`
        }
      });
      const upstream = await r.json();

      // Apply same transform as production route
      const tools = (upstream.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description,
        input_schema: normalizeRootSchema(t.parameters),
      }));

      const mcpSchema = {
        mcp: { version: "1.0" },
        server: { 
          name: { human_readable: upstream.service || "keeper-mcp" }, 
          version: String(upstream.version || "0.0.1") 
        },
        tools,
      };

      res.status(200).json({
        debug: true,
        environment: process.env.NODE_ENV || "development",
        upstream: upstream,
        transformed: mcpSchema
      });
    } catch (error: any) {
      res.status(500).json({ error: "Debug fetch failed", message: error.message });
    }
  });
}

export default router;

