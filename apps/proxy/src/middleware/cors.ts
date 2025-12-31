import { Request, Response, NextFunction } from "express";

export function createCorsMiddleware(allowedOrigins: string[]) {
  const allowAll = allowedOrigins.includes("*");
  return function corsMiddleware(req: Request, res: Response, next: NextFunction) {
    const requestOrigin = (req.headers["origin"] as string | undefined) || "";
    if (allowAll || (requestOrigin && allowedOrigins.includes(requestOrigin))) {
      res.setHeader("Access-Control-Allow-Origin", requestOrigin || "*");
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type,X-User-Authorization,X-User-Token");
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(204);
    }
    next();
  };
}


