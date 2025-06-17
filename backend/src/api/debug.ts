import type { Request, Response, Router } from 'express';
import { Router as expressRouter } from 'express';
import { logger } from '@keeper/shared';

const router: Router = expressRouter();

router.post('/', (req: Request, res: Response) => {
  logger.info('📥 Debug payload received:', req.body);

  res.json({ success: true });
});

export default router; 