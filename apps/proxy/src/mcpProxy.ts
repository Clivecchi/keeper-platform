import express, { Request, Response } from "express";
import fetch from "node-fetch";

const router = express.Router();
const BASE = process.env.KEEPER_API_BASE!;

// ============================================================================
// JSON Schema Normalizer for MCP v1 Strict Compliance
// ============================================================================

type JsonSchema = {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  additionalProperties?: boolean;
};

function isPlainObj(v: unknown): v is Record<string, any> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function normalizeJsonSchema(input: any): JsonSchema {
  const out: JsonSchema = isPlainObj(input) ? { ...input } : {};
  // force root to object schema
  out.type = "object";

  // properties: must be an object (empty allowed)
  const props = isPlainObj((input ?? {}).properties) ? (input as any).properties : {};
  out.properties = { ...props };

  // additionalProperties: must be boolean
  const ap = (input ?? {}).additionalProperties;
  out.additionalProperties = typeof ap === "boolean" ? ap : false;

  // required: must be string[]
  const req = (input ?? {}).required;
  out.required = Array.isArray(req) ? req.filter((x: any) => typeof x === "string") : [];

  // sanitize nested property types to standard primitives
  for (const [k, prop] of Object.entries(out.properties)) {
    if (isPlainObj(prop) && typeof prop.type === "string") {
      const t = prop.type.toLowerCase();
      const ok = ["string", "number", "integer", "boolean", "array", "object"];
      const map: Record<string, string> = { float: "number", double: "number", decimal: "number" };
      const mapped = map[t] ?? t;
      if (!ok.includes(mapped)) {
        // if not standard, remove 'type' and let other keywords (enum, anyOf, etc.) stand
        delete (prop as any).type;
      } else {
        (prop as any).type = mapped;
      }
    }
  }

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

  // Transform to MCP v1 with strict JSON Schema normalization
  const tools = (upstream.tools || []).map((t: any) => {
    const input_schema = normalizeJsonSchema(t.parameters); // <- normalize root + props + types
    const tool: any = {
      name: t.name,
      description: t.description,
      input_schema,
    };
    // Optional compatibility shim (does not violate spec):
    tool.inputSchema = input_schema; // camelCase mirror for clients expecting it
    return tool;
  });

  // Optional diagnostic tool for validation
  tools.push({
    name: "diag_echo",
    description: "Echo input for validation",
    input_schema: {
      type: "object",
      properties: { msg: { type: "string" } },
      required: ["msg"],
      additionalProperties: false,
    },
    inputSchema: { // camelCase mirror, optional
      type: "object",
      properties: { msg: { type: "string" } },
      required: ["msg"],
      additionalProperties: false,
    }
  });

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
      const tools = (upstream.tools || []).map((t: any) => {
        const input_schema = normalizeJsonSchema(t.parameters);
        return {
          name: t.name,
          description: t.description,
          input_schema,
          inputSchema: input_schema, // camelCase mirror
        };
      });

      // Add diagnostic tool
      tools.push({
        name: "diag_echo",
        description: "Echo input for validation",
        input_schema: {
          type: "object",
          properties: { msg: { type: "string" } },
          required: ["msg"],
          additionalProperties: false,
        },
        inputSchema: {
          type: "object",
          properties: { msg: { type: "string" } },
          required: ["msg"],
          additionalProperties: false,
        }
      });

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

