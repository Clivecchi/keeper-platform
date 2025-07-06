import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Railway assigns PORT dynamically, respect that first, then fallback to 8080 for production, 3001 for dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.NODE_ENV === 'production' ? 8080 : 3001);

console.log(`🔧 Server initializing on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV})`);

// Environment validation
const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
  process.exit(1);
});

// 🔧 CRITICAL FIX: Setup CORS immediately before any routes
console.log('⚙️ Setting up CORS...');
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://keeper-platform-hm1kukq25-clivecchis-projects.vercel.app',
    'https://v0-keeper.vercel.app',  // ✅ Added the correct Vercel domain
    '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id']
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log(`📋 CORS preflight for: ${req.method} ${req.path}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-user-id');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).json({ message: 'CORS preflight OK' });
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic endpoints (available immediately)
app.get('/ping', (req, res) => {
  console.log('📍 /ping endpoint hit');
  res.json({ 
    message: '🏓 PONG - Keeper API is alive!',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  console.log('📍 /health endpoint hit');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'keeper-api',
    port: PORT
  });
});

// Railway-specific debug endpoint
app.get('/railway-status', (req, res) => {
  console.log('📍 /railway-status endpoint hit');
  res.json({
    status: 'running',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
      RAILWAY_DEPLOYMENT_ID: process.env.RAILWAY_DEPLOYMENT_ID,
      RAILWAY_REPLICA_ID: process.env.RAILWAY_REPLICA_ID,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN
    },
    server: {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    },
    timestamp: new Date().toISOString()
  });
});

// 🔧 CRITICAL FIX: Initialize server with all modules loaded
async function initializeServer() {
  try {
    console.log('⚙️ Loading all modules synchronously...');

    // Load all modules immediately
    const { logger } = await import('@keeper/shared');
    const { loginUserHandler, registerUserHandler } = await import('@keeper/kam');
    const debugRouterModule = await import('./api/debug.js');
    const debugRouter = debugRouterModule.default;
    const settingsHandlerModule = await import('./api/kam/settings.js');
    const settingsHandler = settingsHandlerModule.default;
    const { logRequestMiddleware } = await import('./middleware/logRequestMiddleware.js');
    const kipAgentsHandlerModule = await import('./api/kip/agents.js');
    const kipAgentsHandler = kipAgentsHandlerModule.default;
    const kipUserKeysHandlerModule = await import('./api/kip/user-keys.js');
    const kipUserKeysHandler = kipUserKeysHandlerModule.default;
    const kipPlatformKeysHandlerModule = await import('./api/kip/platform-keys.js');
    const kipPlatformKeysHandler = kipPlatformKeysHandlerModule.default;
    const keeperRouterModule = await import('./api/keeper/routes.js');
    const keeperRouter = keeperRouterModule.default;

    console.log('✅ All modules loaded successfully');

    // Setup all routes BEFORE starting server
    setupRoutes(logger, loginUserHandler, registerUserHandler, debugRouter, settingsHandler, logRequestMiddleware, kipAgentsHandler, kipUserKeysHandler, kipPlatformKeysHandler, keeperRouter);

    // Start server AFTER all routes are registered
    const server = app.listen(PORT, '::', () => {
      console.log('\n🚀 Keeper API Server');
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 Server running on port ${PORT}`);
      console.log('🔗 Routes available:');
      console.log('  - GET  /ping');
      console.log('  - GET  /health');
      console.log('  - GET  /railway-status');
      console.log('  - GET  /api/test');
      console.log('  - POST /api/kam/auth/login');
      console.log('  - POST /api/kam/auth/register');
      console.log('  - ALL  /api/debug/*');
      console.log('  - ALL  /api/kip/*');
      console.log('  - ALL  /api/keeper/*');
      console.log('\n🔗 Frontend: http://localhost:5173\n');
    });

    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      } else if (error.code === 'EACCES') {
        console.error(`❌ Permission denied to bind to port ${PORT}`);
      } else {
        console.error('❌ Server error:', error.message);
      }
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to initialize server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Start the server
initializeServer();

// Setup routes after modules are loaded
function setupRoutes(logger: any, loginUserHandler: any, registerUserHandler: any, debugRouter: any, settingsHandler: any, logRequestMiddleware: any, kipAgentsHandler: any, kipUserKeysHandler: any, kipPlatformKeysHandler: any, keeperRouter: any) {
  try {
    console.log('⚙️ Setting up routes...');

    // Request logging middleware
    app.use(logRequestMiddleware);

    // Routes
    app.use('/api/debug', debugRouter);

    // Root endpoint
    app.get('/', (req: Request, res: Response) => {
      console.log('📍 / endpoint hit');
      res.json({ 
        message: '✅ Keeper API is running',
        timestamp: new Date().toISOString(),
        service: 'keeper-api',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    app.get('/api/test', (req: Request, res: Response) => {
      console.log('📍 /api/test endpoint hit');
      res.json({ 
        message: '✅ Test route working', 
        timestamp: new Date().toISOString()
      });
    });

    // Auth routes
    app.post('/api/kam/auth/register', async (req: Request, res: Response) => {
      console.log('📍 /api/kam/auth/register endpoint hit');
      try {
        const result = await registerUserHandler(req.body);
        res.status(result.success ? 200 : 400).json(result);
      } catch (err) {
        logger.error('Register handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    app.post('/api/kam/auth/login', async (req: Request, res: Response) => {
      console.log('📍 /api/kam/auth/login endpoint hit');
      try {
        const result = await loginUserHandler(req.body);
        res.status(result.success ? 200 : 401).json(result);
      } catch (err) {
        logger.error('Login handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    // Settings and KIP routes
    app.use('/api/kam/settings', settingsHandler);
    app.use('/api/kip/agents', kipAgentsHandler);
    app.use('/api/kip/user-keys', kipUserKeysHandler);
    app.use('/api/kip/platform-keys', kipPlatformKeysHandler);

    // Keeper routes
    app.use('/api/keeper', keeperRouter);

    console.log('✅ All routes registered successfully');
    
  } catch (error) {
    console.error('❌ Error setting up routes:', error instanceof Error ? error.message : error);
  }
} 