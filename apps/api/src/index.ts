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
// Railway typically assigns PORT dynamically, fallback to 3001 for local dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// CRITICAL: Log if Railway assigned a different port than expected
if (process.env.PORT && process.env.PORT !== '3001') {
  console.log(`🚨 RAILWAY PORT MISMATCH: Railway assigned ${process.env.PORT}, but we might expect 3001!`);
} else if (!process.env.PORT) {
  console.log(`⚠️ WARNING: No PORT env var from Railway, using fallback 3001`);
}

// Railway Environment Debug
console.log('🚂 RAILWAY DEBUG INFO:');
console.log('- PORT assigned by Railway:', process.env.PORT);
console.log('- Final PORT to bind:', PORT);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- Railway Service:', process.env.RAILWAY_SERVICE_NAME);
console.log('- All RAILWAY_ env vars:', 
  Object.keys(process.env)
    .filter(k => k.startsWith('RAILWAY_'))
    .map(k => `${k}=${process.env[k]}`)
);

logger.info('✅ Keeper API starting');

// CRITICAL: Add raw request logging FIRST - before any other middleware
app.use((req, res, next) => {
  console.log(`🚨 RAW REQUEST: ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
  next();
});

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
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200          // For legacy browser support
};

// SIMPLE CORS handling - handle OPTIONS first, before everything else
app.use((req: Request, res: Response, next): void => {
  console.log(`🌐 PROCESSING: ${req.method} ${req.path} from origin: ${req.headers.origin}`);
  
  // Set CORS headers for ALL requests
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    console.log('🔄 OPTIONS request - sending 200 OK');
    res.status(200).json({ message: 'CORS OK' });
    return;
  }
  
  next();
});
app.use(express.json());
app.use(logRequestMiddleware);

app.use('/api/debug', debugRouter);

// Root endpoint for basic connectivity testing
app.get('/', (req, res) => {
  console.log(`🏠 Root endpoint hit from origin: ${req.headers.origin}`);
  res.json({ 
    message: '✅ Keeper API is running',
    timestamp: new Date().toISOString(),
    service: 'keeper-api',
    environment: process.env.NODE_ENV,
    railway_service: process.env.RAILWAY_SERVICE_NAME
  });
});

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

// Add error handling for Railway
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  process.exit(1);
});

// Try to start server with comprehensive error handling
console.log(`🚀 Attempting to start server on port ${PORT}...`);

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ✅ SERVER SUCCESSFULLY STARTED!`);
  console.log(`🚀 Server binding to 0.0.0.0:${PORT}`);
  console.log(`🚀 Railway Service: ${process.env.RAILWAY_SERVICE_NAME || 'unknown'}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`🚀 Health check available at: /health`);
  console.log(`🚀 Process ID: ${process.pid}`);
  
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`🚀 Railway Service: ${process.env.RAILWAY_SERVICE_NAME || 'unknown'}`);
  logger.info(`🚀 Environment: ${process.env.NODE_ENV || 'unknown'}`);
});

server.on('error', (error: any) => {
  console.error('🚨 SERVER ERROR:', error);
  console.error('🚨 Error code:', error.code);
  console.error('🚨 Error message:', error.message);
  if (error.code === 'EADDRINUSE') {
    console.error(`🚨 Port ${PORT} is already in use!`);
  } else if (error.code === 'EACCES') {
    console.error(`🚨 Permission denied to bind to port ${PORT}!`);
  }
  process.exit(1);
});

server.on('listening', () => {
  console.log(`🎯 Server is now listening on 0.0.0.0:${PORT}`);
}); 