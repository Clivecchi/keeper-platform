import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { logger } from '@keeper/shared';

const router: ExpressRouter = Router();

router.post('/', (req, res) => {
  logger.info('📥 Debug payload', req.body);
  res.json({ success: true });
});

export default router; 