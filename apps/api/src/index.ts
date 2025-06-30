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

// Basic endpoints (available immediately)
app.get('/ping', (req, res) => {
  res.json({ 
    message: '🏓 PONG - Keeper API is alive!',
    timestamp: new Date().toISOString(),
    port: PORT,
    env: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'keeper-api',
    port: PORT
  });
});

// Start server
const server = app.listen(PORT, '::', () => {
  console.log('\n🚀 Keeper API Server');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}\n`);
  
  // Load complex modules after basic server is running
  loadComplexModules();
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

// Load complex modules after basic server is running
async function loadComplexModules() {
  try {
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

    setupComplexRoutes(app, logger, loginUserHandler, registerUserHandler, debugRouter, settingsHandler, logRequestMiddleware, kipAgentsHandler, kipUserKeysHandler, kipPlatformKeysHandler);
    
    console.log('✅ All modules loaded successfully');
    
    // Show frontend link at the end
    console.log('\n🔗 Frontend: http://localhost:5173\n');
    
  } catch (error) {
    console.error('❌ Error loading modules:', error instanceof Error ? error.message : error);
  }
}

// Setup routes after modules are loaded
function setupComplexRoutes(app: any, logger: any, loginUserHandler: any, registerUserHandler: any, debugRouter: any, settingsHandler: any, logRequestMiddleware: any, kipAgentsHandler: any, kipUserKeysHandler: any, kipPlatformKeysHandler: any) {
  try {
    // CORS middleware
    app.use((req: Request, res: Response, next: any): void => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
      res.header('Access-Control-Allow-Credentials', 'true');
      
      if (req.method === 'OPTIONS') {
        res.status(200).json({ message: 'CORS OK' });
        return;
      }
      
      next();
    });

    // Middleware
    app.use(express.json());
    app.use(logRequestMiddleware);

    // Routes
    app.use('/api/debug', debugRouter);

    // Root endpoint
    app.get('/', (req: any, res: any) => {
      res.json({ 
        message: '✅ Keeper API is running',
        timestamp: new Date().toISOString(),
        service: 'keeper-api',
        environment: process.env.NODE_ENV || 'development'
      });
    });

    app.get('/api/test', (req: any, res: any) => {
      res.json({ 
        message: '✅ Test route working', 
        timestamp: new Date().toISOString()
      });
    });

    // Auth routes
    app.post('/api/kam/auth/register', async (req: any, res: any) => {
      try {
        const result = await registerUserHandler(req.body);
        res.status(result.success ? 200 : 400).json(result);
      } catch (err) {
        logger.error('Register handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    app.post('/api/kam/auth/login', async (req: Request, res: Response) => {
      try {
        const result = await loginUserHandler(req.body);
        res.status(result.success ? 200 : 401).json(result);
      } catch (err) {
        logger.error('Login handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    // Settings and KIP routes
    app.use('/api/kam/settings', async (req: any, res: any) => {
      try {
        await settingsHandler(req, res);
      } catch (err) {
        logger.error('Settings handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    app.use('/api/kip/agents', async (req: any, res: any) => {
      try {
        await kipAgentsHandler(req, res);
      } catch (err) {
        logger.error('KIP Agents handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    app.use('/api/kip/user-keys', async (req: any, res: any) => {
      try {
        await kipUserKeysHandler(req, res);
      } catch (err) {
        logger.error('KIP User Keys handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    app.use('/api/kip/platform-keys', async (req: any, res: any) => {
      try {
        await kipPlatformKeysHandler(req, res);
      } catch (err) {
        logger.error('KIP Platform Keys handler error', err);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
      }
    });

    logger.info('✅ Keeper API fully configured');
    
  } catch (error) {
    console.error('❌ Error setting up routes:', error instanceof Error ? error.message : error);
  }
} 