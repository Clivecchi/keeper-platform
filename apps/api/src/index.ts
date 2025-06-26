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

// Enhanced CORS configuration for production
const corsOptions = { 
  origin: [
    'http://localhost:5173',           // Local development
    'https://v0-keeper.vercel.app',    // Production Vercel
    'https://keeper-platform-95osbe8hw-clivecchis-projects.vercel.app', // Vercel preview
    /\.vercel\.app$/,                  // Any Vercel domain
    true                              // Allow all others for now
  ], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(logRequestMiddleware);

app.use('/api/debug', debugRouter);

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  logger.info(`🏥 Health check requested from origin: ${req.headers.origin}`);
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'keeper-api',
    railway_service: process.env.RAILWAY_SERVICE_NAME || 'unknown',
    environment: process.env.NODE_ENV || 'unknown'
  });
});

app.get('/api/test', (req, res) => {
  logger.info(`🧪 Test endpoint hit from origin: ${req.headers.origin}`);
  res.json({ 
    message: '✅ Test route working', 
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    railway_service: process.env.RAILWAY_SERVICE_NAME || 'unknown'
  });
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
  logger.info(`🚀 Railway Service: ${process.env.RAILWAY_SERVICE_NAME || 'unknown'}`);
  logger.info(`🚀 Environment: ${process.env.NODE_ENV || 'unknown'}`);
}); 