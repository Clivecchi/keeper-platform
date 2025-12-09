// TASK: Create an authenticated route to return user settings
// 📄 File: src/api/kam/settings.ts

import type { Request, Response } from 'express';
import { getSessionHandler, getUserSettingsHandler } from '@keeper/kam';
import { authWeb } from '../../kam/session.js';

async function ensureCookieIdentity(req: Request, res: Response) {
  await new Promise<void>((resolve) => {
    authWeb(req, res, () => resolve());
  });
}

export default async function handler(req: Request, res: Response) {
  // Root cause note: this endpoint only honored Bearer tokens, so cookie-only
  // V0 sessions always 401'd. Hydrate from the HttpOnly cookie first to keep
  // parity with the rest of the app without touching CORS.
  await ensureCookieIdentity(req, res);
  const cookieUser = (req as any).user;

  if (cookieUser?.id) {
    const settings = await getUserSettingsHandler(cookieUser.id);
    return res.status(200).json({ success: true, data: settings });
  }

  // Fallback: accept Bearer tokens for CLI/tools that do not have cookies
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing token' });
  }

  const session = await getSessionHandler(token);
  if (!session) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  const settings = await getUserSettingsHandler(session.userId);
  return res.status(200).json({ success: true, data: settings });
}