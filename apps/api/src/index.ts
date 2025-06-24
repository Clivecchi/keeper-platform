import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { logger } from '@keeper/shared';
import { loginUserHandler, registerUserHandler } from '@keeper/kam';
import debugRouter from './api/debug.js';
import settingsHandler from './api/kam/settings.js';
import { logRequestMiddleware } from './middleware/logRequestMiddleware.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

logger.info('✅ Keeper API starting');

const corsOptions = { origin: true, credentials: true };
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(logRequestMiddleware);

app.use('/api/debug', debugRouter);

app.get('/api/test', (req, res) => {
  res.json({ message: '✅ Test route working', origin: req.headers.origin });
});

app.post('/api/kam/auth/register', async (req, res) => {
  try {
    const result = await registerUserHandler(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    logger.error('Register handler error', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

const loginRouteHandler = async (req: Request, res: Response) => {
  logger.info('🔐 Login route hit');
  try {
    const result = await loginUserHandler(req.body);
    res.status(result.success ? 200 : 401).json(result);
  } catch (err) {
    logger.error('Login handler error', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};
app.post('/api/kam/auth/login', loginRouteHandler);

app.use('/api/kam/settings', async (req, res) => {
  try {
    await settingsHandler(req, res);
  } catch (err) {
    logger.error('Settings handler error', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

logger.info('✅ Keeper Express server starting...');
app.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
}); 