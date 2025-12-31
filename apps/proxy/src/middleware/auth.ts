import { Request, Response, NextFunction } from "express";

function readIncomingKey(req: Request): string {
  const auth = (req.header("authorization") || "").trim();
  const xkey = (req.header("x-proxy-key") || "").trim();
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  if (auth) {
    return auth;
  }
  if (xkey) {
    return xkey;
  }
  return "";
}

export function requireProxyKey(req: Request, res: Response, next: NextFunction) {
  const EXPECTED = (process.env.PROXY_API_KEY ?? "").trim();
  if (!EXPECTED) {
    return res.status(500).json({ error: "Proxy key not configured" });
  }
  const key = readIncomingKey(req);
  if (!key || key !== EXPECTED) {
    // eslint-disable-next-line no-console
    console.warn("[proxy][auth][401]", { got: key ? `${key.slice(0,4)}…${key.slice(-4)}` : "none" });
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}


