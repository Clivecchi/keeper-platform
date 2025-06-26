// ===== EARLIEST POSSIBLE DEBUG POINT =====
console.log('🚀 [STARTUP] Node.js process starting...');
console.log('🚀 [STARTUP] Process ID:', process.pid);
console.log('🚀 [STARTUP] Node version:', process.version);
console.log('🚀 [STARTUP] Platform:', process.platform);
console.log('🚀 [STARTUP] Architecture:', process.arch);
console.log('🚀 [STARTUP] Working directory:', process.cwd());
console.log('🚀 [STARTUP] Script arguments:', process.argv);

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 [STARTUP] Imports loaded successfully');

import { logger } from '@keeper/shared';
import { loginUserHandler, registerUserHandler } from '@keeper/kam';
import debugRouter from './api/debug.js';
import settingsHandler from './api/kam/settings.js';
import { logRequestMiddleware } from './middleware/logRequestMiddleware.js';

console.log('🚀 [STARTUP] All modules imported successfully');

dotenv.config();
console.log('🚀 [STARTUP] Environment variables loaded');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('🚀 [STARTUP] Directory resolved:', __dirname);

console.log('🚀 [EXPRESS] Creating Express application...');
const app = express();
console.log('🚀 [EXPRESS] Express app created successfully');

// Railway expects port 8080, fallback to 3001 for local dev
const PORT = process.env.NODE_ENV === 'production' ? 8080 : (process.env.PORT ? parseInt(process.env.PORT, 10) : 3001);
console.log('🚀 [CONFIG] Port configuration complete:', PORT);
console.log('🚀 [CONFIG] Environment:', process.env.NODE_ENV);

// CRITICAL: Railway port configuration debug
if (process.env.NODE_ENV === 'production') {
  console.log(`🚂 RAILWAY: Using production port 8080 (Railway's expected port)`);
} else if (process.env.PORT && process.env.PORT !== '3001') {
  console.log(`🚨 DEV PORT: Using assigned port ${process.env.PORT}`);
} else if (!process.env.PORT) {
  console.log(`⚠️ DEV FALLBACK: No PORT env var, using fallback 3001`);
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
console.log('🚀 [MIDDLEWARE] Starting middleware setup...');

// CRITICAL: Add raw request logging FIRST - before any other middleware
console.log('🚀 [MIDDLEWARE] Adding raw request logger...');
app.use((req, res, next) => {
  console.log(`🚨 RAW REQUEST: ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
  next();
});
console.log('🚀 [MIDDLEWARE] Raw request logger added');

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
console.log('🚀 [MIDDLEWARE] Adding CORS handler...');
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
console.log('🚀 [MIDDLEWARE] CORS handler added');

console.log('🚀 [MIDDLEWARE] Adding JSON parser...');
app.use(express.json());
console.log('🚀 [MIDDLEWARE] JSON parser added');

console.log('🚀 [MIDDLEWARE] Adding request logger...');
app.use(logRequestMiddleware);
console.log('🚀 [MIDDLEWARE] Request logger added');

console.log('🚀 [ROUTES] Adding debug router...');
app.use('/api/debug', debugRouter);
console.log('🚀 [ROUTES] Debug router added');

// Root endpoint for basic connectivity testing
console.log('🚀 [ROUTES] Adding root endpoint...');
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
console.log('🚀 [SERVER] All setup complete, starting server...');
console.log(`🚀 [SERVER] Attempting to bind to 0.0.0.0:${PORT}...`);

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
  console.log(`🎯 [SERVER] Server is now listening on 0.0.0.0:${PORT}`);
  console.log(`🎯 [SERVER] Server address:`, server.address());
  console.log(`🎯 [SERVER] Ready to accept connections`);
});

// Add connection-level debugging
server.on('connection', (socket) => {
  console.log(`🔌 [CONNECTION] New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  
  socket.on('close', () => {
    console.log(`🔌 [CONNECTION] Connection closed from ${socket.remoteAddress}:${socket.remotePort}`);
  });
  
  socket.on('error', (err) => {
    console.log(`🔌 [CONNECTION] Socket error from ${socket.remoteAddress}:${socket.remotePort}:`, err);
  });
});

// Add request-level debugging at the HTTP level
server.on('request', (req, res) => {
  console.log(`📥 [HTTP] Incoming HTTP request: ${req.method} ${req.url}`);
  console.log(`📥 [HTTP] Request headers:`, req.headers);
}); 