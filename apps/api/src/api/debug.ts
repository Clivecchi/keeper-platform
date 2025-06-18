import { Router } from 'express';
import { logger } from '@keeper/shared';

const router = Router();

router.post('/', (req, res) => {
  logger.info('📥 Debug payload', req.body);
  res.json({ success: true });
});

export default router; 