import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import debugRouter from './api/debug.js';
dotenv.config();
import settingsHandler from './api/kam/settings.js';
import { loginUserHandler } from './kam/auth/login.js';
import { registerUserHandler } from './kam/auth/register.js';
import { logRequestMiddleware } from './middleware/logRequestMiddleware.js';
import type { Request, Response } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const prisma = new PrismaClient();

// ✅ Startup log
console.log('✅ Keeper backend server started');

let server: any = null;
let isShuttingDown = false;

// Health check endpoint for Railway
app.get('/health', async (req, res) => {
  if (isShuttingDown) {
    res.status(503).json({ status: 'shutting_down' });
    return;
  }

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      error: 'Database connection failed'
    });
  }
});

// Graceful shutdown handling
const gracefulShutdown = async () => {
  if (isShuttingDown) {
    console.log('⚠️ Already shutting down, forcing exit');
    process.exit(0);
    return;
  }
  
  isShuttingDown = true;
  console.log('🔄 Starting graceful shutdown...');
  
  // Force exit after 5 seconds
  const forceExit = setTimeout(() => {
    console.log('⚠️ Force exit after timeout');
    process.exit(0);
  }, 5000);
  
  if (server) {
    server.close(() => {
      console.log('✅ Server closed successfully');
      clearTimeout(forceExit);
      process.exit(0);
    });
  } else {
    console.log('⚠️ No server instance to close');
    clearTimeout(forceExit);
    process.exit(0);
  }
};

process.on('SIGTERM', () => {
  console.log('📢 Received SIGTERM signal');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  console.log('📢 Received SIGINT signal');
  gracefulShutdown();
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

try {
  console.log('1️⃣ Starting server initialization...');

  // 🚦 CORS setup
  console.log('2️⃣ Starting CORS setup...');
  const getCorsOrigins = () => {
    console.log('3️⃣ Getting CORS origins...');
    const envOrigins = process.env.CORS_ORIGINS;
    console.log('Raw CORS_ORIGINS:', envOrigins);
    
    if (!envOrigins) {
      console.log('No CORS_ORIGINS found in environment, using defaults');
      return [
        'https://v0-keeper.vercel.app',
        'http://localhost:5173',
        'http://livecchi.biz'
      ];
    }
    
    console.log('4️⃣ Parsing CORS origins...');
    // Simple split and trim
    const origins = envOrigins
      .split(',')
      .map(origin => origin.trim())
      .filter(origin => origin.length > 0);
      
    // Log each origin individually to see actual values
    origins.forEach((o, i) => console.log(`Origin [${i}]:`, JSON.stringify(o)));
    
    return origins;
  };

  console.log('5️⃣ Getting allowed origins...');
  const allowedOrigins = getCorsOrigins();
  console.log('6️⃣ CORS origins setup complete');

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 204,
  };

  console.log('7️⃣ Applying CORS middleware...');
  // Apply CORS before other middleware
  app.use(cors(corsOptions));

  // Explicit preflight handler for all API routes
  app.options('*', cors(corsOptions));
  console.log('8️⃣ CORS middleware applied');

  // Log every incoming request (for debugging in Railway logs)
  app.use((req, _res, next) => {
    console.log(`[IN] ${req.method} ${req.path} (Origin: ${req.headers.origin || 'none'})`);
    console.log('[REQ] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[REQ] Body:', JSON.stringify(req.body, null, 2));
    next();
  });

  // ✅ Parse incoming JSON bodies
  console.log('9️⃣ Setting up JSON parsing...');
  app.use(express.json());
  console.log('🔟 JSON parsing setup complete');

  app.use(logRequestMiddleware);

  // Simple test route to confirm routing and CORS
  app.get('/api/test', (req, res) => {
    console.log('[TEST] Test route hit');
    res.json({ message: '✅ Test route working', origin: req.headers.origin });
  });

  // Auth routes
  app.post('/api/kam/auth/register', async (req, res) => {
    console.log('[REGISTER] Register route hit');
    try {
      const result = await registerUserHandler(req.body);
      console.log('[REGISTER] Result:', JSON.stringify(result, null, 2));
      res.status(result.success ? 200 : 400).json(result);
    } catch (err) {
      console.error('[REGISTER] Handler error:', err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  const loginRouteHandler = async (req: Request, res: Response) => {
    console.log('🔐 Login route hit');
    console.log('[LOGIN] Request body:', JSON.stringify(req.body, null, 2));
    console.log('[LOGIN] Headers:', JSON.stringify(req.headers, null, 2));
    try {
      const result = await loginUserHandler(req.body);
      console.log('[LOGIN] Result:', JSON.stringify(result, null, 2));
      res.status(result.success ? 200 : 401).json(result);
    } catch (err) {
      console.error('[LOGIN] Handler error:', err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  };

  app.post('/api/kam/auth/login', loginRouteHandler);

  // Settings route
  app.use('/api/kam/settings', async (req, res) => {
    try {
      await settingsHandler(req, res);
    } catch (err) {
      console.error('Handler error:', err);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  });

  // Debug diagnostics route
  app.use('/api/debug', debugRouter);

  console.log('✅ Keeper Express server starting...');
  console.log('🔧 Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    HOST: process.env.HOST || '0.0.0.0'
  });

  console.log('🚀 Attempting to start server...');
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log('✅ Server successfully bound to port', PORT);
    console.log('📡 Accepting connections on all interfaces (0.0.0.0)');
  });

  server.on('error', (error: any) => {
    console.error('❌ Server error:', error);
    process.exit(1);
  });

} catch (error) {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
} 