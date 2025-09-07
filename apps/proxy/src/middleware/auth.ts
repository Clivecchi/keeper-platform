import { Request, Response, NextFunction } from "express";

export function createProxyAuthMiddleware(expectedApiKey: string) {
  return function proxyAuthMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }
    const providedKey = authHeader.substring("Bearer ".length).trim();
    if (providedKey !== expectedApiKey) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  };
}


