// ===== MINIMAL STARTUP FOR RAILWAY DEBUGGING =====
console.log('🚀 [STARTUP] Node.js process starting...');
console.log('🚀 [STARTUP] Process ID:', process.pid);
console.log('🚀 [STARTUP] Node version:', process.version);
console.log('🚀 [STARTUP] Platform:', process.platform);
console.log('🚀 [STARTUP] Working directory:', process.cwd());

// Log ALL environment variables to see what Railway is providing
console.log('🚀 [ENV] All environment variables:');
Object.keys(process.env).sort().forEach(key => {
  if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('TOKEN')) {
    console.log(`${key}=***HIDDEN***`);
  } else {
    console.log(`${key}=${process.env[key]}`);
  }
});

import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🚀 [STARTUP] Imports loaded successfully');

// Load environment first
dotenv.config();
console.log('🚀 [STARTUP] Environment variables loaded');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log('🚀 [STARTUP] Directory resolved:', __dirname);

console.log('🚀 [EXPRESS] Creating Express application...');
const app = express();
console.log('🚀 [EXPRESS] Express app created successfully');

// Railway assigns PORT dynamically, respect that first, then fallback to 8080 for production, 3001 for dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.NODE_ENV === 'production' ? 8080 : 3001);
console.log('🚀 [CONFIG] Port configuration complete:', PORT);
console.log('🚀 [CONFIG] Environment:', process.env.NODE_ENV);

// CRITICAL: Railway port configuration debug
console.log(`🚂 RAILWAY PORT LOGIC:`);
console.log(`  - process.env.PORT: ${process.env.PORT || 'undefined'}`);
console.log(`  - process.env.NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`  - Final PORT: ${PORT}`);

if (process.env.PORT) {
  console.log(`✅ RAILWAY: Using Railway-assigned port ${process.env.PORT}`);
} else if (process.env.NODE_ENV === 'production') {
  console.log(`🚂 PRODUCTION: No Railway PORT assigned, using fallback 8080`);
} else {
  console.log(`💻 DEVELOPMENT: Using local development port 3001`);
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

// Add startup error logging
console.log('🚀 [STARTUP] Checking critical environment variables...');
console.log('🚀 [ENV] NODE_ENV:', process.env.NODE_ENV);
console.log('🚀 [ENV] PORT:', process.env.PORT);
console.log('🚀 [ENV] JWT_SECRET:', process.env.JWT_SECRET ? '✓ SET' : '✗ MISSING');
console.log('🚀 [ENV] DATABASE_URL:', process.env.DATABASE_URL ? '✓ SET' : '✗ MISSING');

// Add error handling for Railway
process.on('uncaughtException', (error) => {
  console.error('🚨 UNCAUGHT EXCEPTION:', error);
  console.error('🚨 Stack trace:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
  console.error('🚨 Full error object:', reason);
  process.exit(1);
});

// CRITICAL: Add basic ping endpoint BEFORE any complex imports
console.log('🚀 [ROUTES] Adding basic ping endpoint...');
app.get('/ping', (req, res) => {
  console.log(`🏓 Ping endpoint hit from origin: ${req.headers.origin}`);
  res.json({ 
    message: '🏓 PONG - Railway Express server is alive!',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});
console.log('🚀 [ROUTES] ✓ Basic ping endpoint added');

// Health check endpoint for Railway (before complex imports)
console.log('🚀 [ROUTES] Adding basic health endpoint...');
app.get('/health', (req, res) => {
  console.log(`🏥 Health check requested from origin: ${req.headers.origin}`);
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'keeper-api-basic',
    port: PORT,
    env: process.env.NODE_ENV || 'unknown'
  });
});
console.log('🚀 [ROUTES] ✓ Basic health endpoint added');

// Try to start server BEFORE complex imports to test basic functionality
console.log('🚀 [SERVER] Starting basic server first...');
console.log(`🚀 [SERVER] Attempting to bind to [::]:${PORT} (IPv6 + IPv4)...`);

const server = app.listen(PORT, '::', () => {
  console.log(`🚀 ✅ BASIC SERVER SUCCESSFULLY STARTED!`);
  console.log(`🚀 Server binding to [::]:${PORT} (IPv6 + IPv4)`);
  console.log(`🚀 Railway Service: ${process.env.RAILWAY_SERVICE_NAME || 'unknown'}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'unknown'}`);
  console.log(`🚀 Basic health check available at: /health`);
  console.log(`🚀 Basic ping available at: /ping`);
  console.log(`🚀 Process ID: ${process.pid}`);
  
  // Now load complex imports AFTER server is started
  console.log('🚀 [STARTUP] Basic server started, now loading complex modules...');
  loadComplexModules();
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
  console.log(`🎯 [SERVER] Basic server is now listening on [::]:${PORT} (IPv6 + IPv4)`);
  console.log(`🎯 [SERVER] Server address:`, server.address());
  console.log(`🎯 [SERVER] Ready to accept connections`);
});

// Function to load complex modules after basic server is running
async function loadComplexModules() {
  try {
    console.log('🚀 [STARTUP] Importing @keeper/shared...');
    const { logger } = await import('@keeper/shared');
    console.log('🚀 [STARTUP] ✓ @keeper/shared imported');

    console.log('🚀 [STARTUP] Importing @keeper/kam...');
    const { loginUserHandler, registerUserHandler } = await import('@keeper/kam');
    console.log('🚀 [STARTUP] ✓ @keeper/kam imported');

    console.log('🚀 [STARTUP] Importing debug router...');
    const debugRouterModule = await import('./api/debug.js');
    const debugRouter = debugRouterModule.default;
    console.log('🚀 [STARTUP] ✓ debug router imported');

    console.log('🚀 [STARTUP] Importing settings handler...');
    const settingsHandlerModule = await import('./api/kam/settings.js');
    const settingsHandler = settingsHandlerModule.default;
    console.log('🚀 [STARTUP] ✓ settings handler imported');

    console.log('🚀 [STARTUP] Importing request middleware...');
    const { logRequestMiddleware } = await import('./middleware/logRequestMiddleware.js');
    console.log('🚀 [STARTUP] ✓ request middleware imported');

    console.log('🚀 [STARTUP] All modules imported successfully');

    // Now add complex middleware and routes
    setupComplexRoutes(app, logger, loginUserHandler, registerUserHandler, debugRouter, settingsHandler, logRequestMiddleware);
    
  } catch (error) {
    console.error('🚨 ERROR loading complex modules:', error);
    console.error('🚨 Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    // Don't exit - keep basic server running
  }
}

// Function to setup complex routes after modules are loaded
function setupComplexRoutes(app: any, logger: any, loginUserHandler: any, registerUserHandler: any, debugRouter: any, settingsHandler: any, logRequestMiddleware: any) {
  try {
    logger.info('✅ Keeper API starting');
    console.log('🚀 [MIDDLEWARE] Starting middleware setup...');

    // CRITICAL: Add raw request logging FIRST - before any other middleware
    console.log('🚀 [MIDDLEWARE] Adding raw request logger...');
    app.use((req: any, res: any, next: any) => {
      console.log(`🚨 RAW REQUEST: ${req.method} ${req.url} - Headers: ${JSON.stringify(req.headers)}`);
      next();
    });
    console.log('🚀 [MIDDLEWARE] Raw request logger added');

    // SIMPLE CORS handling - handle OPTIONS first, before everything else
    console.log('🚀 [MIDDLEWARE] Adding CORS handler...');
    app.use((req: Request, res: Response, next: any): void => {
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
    app.get('/', (req: any, res: any) => {
      console.log(`🏠 Root endpoint hit from origin: ${req.headers.origin}`);
      res.json({ 
        message: '✅ Keeper API is running',
        timestamp: new Date().toISOString(),
        service: 'keeper-api',
        environment: process.env.NODE_ENV,
        railway_service: process.env.RAILWAY_SERVICE_NAME
      });
    });

    app.get('/api/test', (req: any, res: any) => {
      logger.info(`🧪 Test endpoint hit from origin: ${req.headers.origin}`);
      res.json({ 
        message: '✅ Test route working', 
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        railway_service: process.env.RAILWAY_SERVICE_NAME || 'unknown'
      });
    });

    app.post('/api/kam/auth/register', async (req: any, res: any) => {
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

    app.use('/api/kam/settings', async (req: any, res: any) => {
      try {
        await settingsHandler(req, res);
      } catch (err) {
        logger.error('Settings handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    console.log('🚀 [SETUP] Complex routes and middleware setup complete');
    logger.info('✅ Keeper Express server fully configured');
    
  } catch (error) {
    console.error('🚨 ERROR setting up complex routes:', error);
    console.error('🚨 Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
  }
}

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