import express, { Request, Response } from "express";
import fetch from "node-fetch";

const router = express.Router();

// Basic CORS for MCP (echo Origin, allow preflight)
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

const BASE = process.env.KEEPER_API_BASE!;

// GET /api/mcp/schema  → forward
router.get("/schema", async (req: Request, res: Response) => {
  const r = await fetch(`${BASE}/api/mcp/schema`, {
    headers: {
      "x-api-key": req.header("x-api-key") || "",
      "authorization": req.header("authorization") || ""
    }
  });
  const body = await r.text();
  res.status(r.status).set("Content-Type", r.headers.get("content-type") || "application/json").send(body);
});

// POST /api/mcp/call  → forward
router.post("/call", async (req: Request, res: Response) => {
  const r = await fetch(`${BASE}/api/mcp/call`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": req.header("x-api-key") || "",
      "authorization": req.header("authorization") || ""
    },
    body: JSON.stringify(req.body || {})
  });
  const body = await r.text();
  res.status(r.status).set("Content-Type", r.headers.get("content-type") || "application/json").send(body);
});

export default router;

