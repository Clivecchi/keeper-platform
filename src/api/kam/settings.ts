// TASK: Create an authenticated route to return user settings
// 📄 File: src/api/kam/settings.ts

import type { Request, Response } from 'express';
import { getSessionHandler } from '../../kam/auth/session';
import { getUserSettingsHandler } from '../../kam/settings';

export default async function handler(req: Request, res: Response) {
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