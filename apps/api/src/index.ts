import express from 'express';
import type { Request, Response, Express, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Import domain routes
import domainRoutes from './api/domains/routes.js';
import adminDomainRoutes from './api/admin/domains.js';
import adminRolesRoutes from './api/admin/roles.js';
import adminUsersRoutes from './api/admin/users.js';
// Import KIP routes
import kipAgentsHandler from './api/kip/agents.js';
import kipPlatformKeysRouter from './api/kip/platform-keys.js';
import { getUserKeys, setUserKey, deleteUserKey, getUserProviders } from './api/kip/user-keys.js';
// Import KAM settings handler
import kamSettingsHandler from './api/kam/settings.js';
// Import database client
import { prisma } from '@keeper/database';
import { authMiddleware, authMiddlewareCompat, AuthenticatedRequest } from './middleware/authMiddleware.js';
import keeperRoutes from './api/keeper/routes.js';
import debugRouter from './api/debug.js';

// Load environment variables
dotenv.config();

// Log level configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDebug = LOG_LEVEL === 'debug';
const isVerbose = LOG_LEVEL === 'verbose';

const app: Express = express();

// Add validation schema for user updates
const UpdateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar_url: z.string().url().optional(),
});

// NEW AUTH SCHEMAS
const AuthLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const AuthRegisterSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

// Railway assigns PORT dynamically, respect that first, then fallback to 8080 for production, 3001 for dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.NODE_ENV === 'production' ? 8080 : 3001);

console.log(`🔧 Server initializing on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV})`);

// Error handling
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error.message);
  console.error('🚨 Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection:', reason);
  console.error('🚨 Promise:', promise);
  process.exit(1);
});

// Request logging middleware (applied to all requests) - optimized to reduce noise
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // Skip logging for OPTIONS requests to reduce noise
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Only log in development or if explicitly enabled
  if (isDevelopment || process.env.ENABLE_REQUEST_LOGGING === 'true') {
    console.log(`📨 ${timestamp} - ${req.method} ${req.path}`);
    console.log(`📨 Origin: ${req.get('origin') || 'none'}`);
    
    // Log response when finished
    res.on('finish', () => {
      console.log(`📤 ${timestamp} - ${req.method} ${req.path} - Status: ${res.statusCode}`);
    });
  }
  
  next();
});

// CORS setup - optimized to reduce duplicate requests
console.log('⚙️ Setting up CORS...');
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173', 
      'https://keeper-platform-hm1kukq25-clivecchis-projects.vercel.app',
      'https://v0-keeper.vercel.app',
      'https://keeper-platform.vercel.app'
    ];
    
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // For debugging, allow all origins temporarily
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-debug-token'],
  exposedHeaders: ['x-debug-info'],
  // Add preflightContinue to prevent duplicate handling
  preflightContinue: false,
  // Cache preflight results for 24 hours
  maxAge: 86400
}));

// CORS preflight requests are handled automatically by the cors middleware above

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

// Basic endpoints
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

// 🔧 Debug endpoints removed – now handled by debugRouter mounted at /api/debug

// COMPREHENSIVE DEBUG ENDPOINT - ALL INFORMATION IN ONE PLACE
app.get('/debug', (req, res) => {
  console.log('🔍 /debug endpoint hit - COMPREHENSIVE system info');
  
  const timestamp = new Date().toISOString();
  
  // Collect all environment variables
  const envVars = Object.keys(process.env).reduce((acc, key) => {
    // Don't expose sensitive data but show if they exist
    if (key.includes('PASSWORD') || key.includes('SECRET') || key.includes('TOKEN')) {
      acc[key] = process.env[key] ? '***HIDDEN***' : undefined;
    } else {
      acc[key] = process.env[key];
    }
    return acc;
  }, {} as Record<string, string | undefined>);

  // Check for domain-related issues
  const domainIssues = [];
  if (req.headers.host !== 'keeper-platform-production.up.railway.app') {
    domainIssues.push(`Unexpected host: ${req.headers.host}`);
  }
  
  // Check for middleware issues
  const middlewareStatus = {
    cors_configured: true,
    request_logging: true,
    json_parser: true,
    url_encoded: true
  };

  const comprehensiveDebugInfo = {
    // 🕒 Timestamp
    timestamp,
    
    // 🚨 POTENTIAL ISSUES
    issues: {
      domain_related: domainIssues,
      middleware_warnings: [],
      environment_warnings: !process.env.NODE_ENV ? ['NODE_ENV not set'] : []
    },
    
    // 🖥️ SERVER INFO
    server: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      cwd: process.cwd(),
      startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
    },
    
    // 🌍 FULL ENVIRONMENT
    environment: {
      all_vars: envVars,
      railway_specific: {
        RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
        RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
        RAILWAY_DEPLOYMENT_ID: process.env.RAILWAY_DEPLOYMENT_ID,
        RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
        RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN,
        RAILWAY_PROJECT_ID: process.env.RAILWAY_PROJECT_ID,
        RAILWAY_GIT_BRANCH: process.env.RAILWAY_GIT_BRANCH,
        RAILWAY_GIT_COMMIT_SHA: process.env.RAILWAY_GIT_COMMIT_SHA
      },
      node_env: process.env.NODE_ENV,
      port: process.env.PORT
    },
    
    // 📨 CURRENT REQUEST
    request: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      query: req.query,
      headers: req.headers,
      ip: req.ip,
      ips: req.ips,
      protocol: req.protocol,
      secure: req.secure,
      hostname: req.hostname,
      subdomains: req.subdomains
    },
    
    // 🌐 CORS & NETWORKING
    cors: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      host: req.get('host'),
      user_agent: req.get('user-agent'),
      forwarded_for: req.get('x-forwarded-for'),
      forwarded_proto: req.get('x-forwarded-proto'),
      real_ip: req.get('x-real-ip')
    },
    
    // 🔧 MIDDLEWARE STATUS
    middleware: middlewareStatus,
    
    // 📊 SYSTEM HEALTH
    health: {
      status: 'healthy',
      can_connect_to_db: 'not_tested', // TODO: Add DB connection test
      can_write_files: 'not_tested',
      memory_usage_percent: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100)
    },
    
    // 🎯 AVAILABLE ENDPOINTS
    endpoints: {
      available: [
        'GET /',
        'GET /ping',
        'GET /health',
        'GET /debug',
        'GET /debug/simple',
        'GET /debug/cors',
        'POST /debug/test-connection',
        'GET /railway-status',
        'GET /api/test',
        'POST /api/kam/auth/login',
        'POST /api/kam/auth/register',
        'POST /api/kam/auth/logout',
        '🏗️ DOMAIN API ENDPOINTS:',
        'GET /api/domains (search domains)',
        'GET /api/domains/my (user domains)',
        'POST /api/domains (create domain) ← SAVE BUTTON!',
        'GET /api/domains/:id (get domain)',
        'PUT /api/domains/:id (update domain)',
        'DELETE /api/domains/:id (delete domain)',
        'GET /api/domains/:id/permissions',
        'POST /api/domains/:id/permissions',
        'POST /api/domains/:id/verify',
        '🤖 KIP API ENDPOINTS:',
        'GET /api/kip/agents (get all agents)',
        'POST /api/kip/agents (create agent / run agent)',
        'PUT /api/kip/agents (update agent)',
        'DELETE /api/kip/agents (delete agent)',
        'GET /api/kip/platform-keys (admin keys)',
        'POST /api/kip/platform-keys (create platform key)',
        'GET /api/kip/user-keys (user keys)',
        'POST /api/kip/user-keys (create user key)',
        'DELETE /api/kip/user-keys/:keyId (delete user key)',
        'GET /api/kip/user-keys/providers (get providers)',
        '📱 USER PROFILE ENDPOINTS:',
        'PUT /api/users/:id (update profile - FIXED!)'
      ],
      recently_accessed: [], // TODO: Track recent endpoint access
    },
    
    // 🚀 DEPLOYMENT INFO
    deployment: {
      deployed_at: process.env.RAILWAY_DEPLOYMENT_ID ? 'Railway deployment' : 'Local/Other',
      build_info: {
        node_env: process.env.NODE_ENV,
        railway_deployment_id: process.env.RAILWAY_DEPLOYMENT_ID,
        git_commit: process.env.RAILWAY_GIT_COMMIT_SHA,
        git_branch: process.env.RAILWAY_GIT_BRANCH
      }
    },
    
    // 📱 CLIENT INFO (from headers)
    client: {
      user_agent: req.get('user-agent'),
      accept: req.get('accept'),
      accept_language: req.get('accept-language'),
      accept_encoding: req.get('accept-encoding'),
      connection: req.get('connection'),
      cache_control: req.get('cache-control')
    },
    
    // 🔍 DEBUGGING HELPERS
    debugging: {
      request_id: req.get('x-railway-request-id') || 'local-request',
      trace_id: req.get('x-trace-id') || 'no-trace',
      session_info: 'no-session-middleware',
      auth_info: 'no-auth-middleware'
    }
  };
  
  // Add response headers for debugging
  res.header('x-debug-timestamp', timestamp);
  res.header('x-debug-request-id', req.get('x-railway-request-id') || 'local');
  res.header('x-debug-version', 'comprehensive-v1');
  
  res.json(comprehensiveDebugInfo);
});

// Keep simple endpoint for quick tests
app.get('/debug/simple', (req, res) => {
  console.log('🔍 /debug/simple endpoint hit');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Simple debug endpoint working',
    origin: req.get('origin'),
    host: req.get('host')
  });
});

// CORS test endpoint
app.get('/debug/cors', (req, res) => {
  console.log('🔍 /debug/cors endpoint hit');
  res.json({
    message: 'CORS debug endpoint',
    origin: req.get('origin'),
    headers: {
      'access-control-allow-origin': res.get('access-control-allow-origin'),
      'access-control-allow-credentials': res.get('access-control-allow-credentials')
    },
    timestamp: new Date().toISOString()
  });
});

// Test connectivity from different sources
app.post('/debug/test-connection', (req, res) => {
  console.log('🔍 /debug/test-connection endpoint hit');
  console.log('📦 Request body:', req.body);
  
  res.json({
    message: 'Connection test successful',
    received: req.body,
    timestamp: new Date().toISOString(),
    origin: req.get('origin'),
    userAgent: req.get('user-agent')
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
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN
    },
    server: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime()
    },
    timestamp: new Date().toISOString()
  });
});

// API test endpoint
app.get('/api/test', (req, res) => {
  console.log('📍 /api/test endpoint hit');
  res.json({
    message: 'API is working',
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    headers: req.headers
  });
});

// KAM Auth endpoints that the frontend is trying to access
app.post('/api/kam/auth/login', async (req, res) => {
  try {
    // Validate request body
    const { email, password } = AuthLoginSchema.parse(req.body);

    // Look up user by email
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user || !user.hashedPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
      });
    }

    // Sign JWT
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d',
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Auth login error:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

app.post('/api/kam/auth/register', async (req, res) => {
  try {
    // Validate request body
    const { name, email, password } = AuthRegisterSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = await prisma.users.create({
      data: {
        id: randomUUID(),
        email,
        name,
        hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // 🚀 Automatically create a personal primary domain for the new user
    try {
      // Very small slugify helper – keeps alphanumerics, replaces others with dashes
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^(-)+|(-)+$/g, '');

      await prisma.domain.create({
        data: {
          id: randomUUID(),
          name: name, // Use the user’s name verbatim – includes spaces for cleaner display
          slug,
          ownerId: newUser.id,
          status: 'active',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          features: {},
          settings: {},
        },
      });
    } catch (domainError) {
      console.error('❗ Failed to create personal domain on signup:', domainError);
      // We don’t fail the signup if domain creation fails, but we surface a log for debugging.
    }

    // Sign JWT
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d',
    });

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatar_url: newUser.avatar_url,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Auth register error:', error);
    return res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Invalid request',
    });
  }
});

app.post('/api/kam/auth/logout', (req, res) => {
  console.log('📍 /api/kam/auth/logout endpoint hit');
  
  // Return simple success response for logout
  res.json({
    success: true,
    data: {
      message: 'Logged out successfully'
    }
  });
});

// User profile update route
app.put('/api/users/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    
    // Check if user is authenticated
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
      return;
    }
    
    // Ensure user can only update their own profile
    if (userId !== req.user.id) {
      res.status(403).json({ 
        success: false, 
        error: 'You can only update your own profile' 
      });
      return;
    }

    // Validate input
    const updateData = UpdateUserSchema.parse(req.body);
    
    // Update user using prisma client
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        UserSettings: true
      }
    });
    
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar_url: updatedUser.avatar_url
      }
    });
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile',
    });
  }
});

// ----- User Search (for member management) -----
app.get('/api/users/search', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { q = '', limit = 20 } = req.query as Record<string, string>;
    const term = q.toString().trim();
    if (!term) return res.json({ users: [] });

    const users = await prisma.users.findMany({
      where: {
        OR: [
          { email: { contains: term, mode: 'insensitive' } },
          { name: { contains: term, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true },
      take: Number(limit) || 20,
      orderBy: { createdAt: 'desc' },
    });

    const mapped = users.map(u => ({ id: u.id, label: u.name || u.email || u.id }));
    return res.json({ users: mapped });
  } catch (error) {
    console.error('[UserSearch] error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect domain routes
app.use('/api/domains', domainRoutes);

// Admin domain management (super-admin only)
app.use('/api/admin/domains', adminDomainRoutes);

// Platform role management
app.use('/api/admin/roles', adminRolesRoutes);
app.use('/api/admin/users', adminUsersRoutes);

// NEW: Connect Keeper routes
app.use('/api/keeper', keeperRoutes);

// Connect KIP routes
app.use('/api/kip/agents', kipAgentsHandler);
app.use('/api/kip/platform-keys', kipPlatformKeysRouter);
// Connect unified Debug routes
app.use('/api/debug', debugRouter);

// KIP User Keys routes - individual function handlers
app.get('/api/kip/user-keys', getUserKeys);
app.post('/api/kip/user-keys', setUserKey);
app.delete('/api/kip/user-keys/:keyId', deleteUserKey);
app.get('/api/kip/user-keys/providers', getUserProviders);

// KAM Settings route
app.get('/api/kam/settings', kamSettingsHandler);

// Themes route
app.get('/api/themes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const theme = await prisma.themes.findUnique({
      where: { id },
      select: {
        id: true,
        label: true,
        slug: true,
        palette: true,
        style: true,
        default_mode: true,
        tags: true,
        created_at: true,
        updated_at: true
      }
    });

    if (!theme) {
      return res.status(404).json({ 
        success: false, 
        error: 'Theme not found' 
      });
    }

    return res.json({ 
      success: true, 
      data: theme 
    });
  } catch (error) {
    console.error('Theme fetch error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch theme' 
    });
  }
});

// Global Error Handler - Catch-all safety net across API
function globalErrorHandler(err: unknown, req: Request, res: Response, next: NextFunction): Response | void {
  // Log error details (only in development or debug mode)
  if (isDebug || process.env.NODE_ENV === 'development') {
    console.error('🚨 Global Error Handler caught:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined,
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  } else {
    // Production logging - minimal
    console.error('🚨 API Error:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      method: req.method,
      path: req.path,
      timestamp: new Date().toISOString()
    });
  }

  // Handle different error types
  let statusCode = 500;
  let errorCode = 'INTERNAL_SERVER_ERROR';
  let message = 'Internal server error';
  let details: Record<string, unknown> | undefined = undefined;

  // Domain errors (from our middleware)
  if (err && typeof err === 'object' && 'code' in err && 'statusCode' in err) {
    const domainError = err as { statusCode: number; code: string; message: string; details?: Record<string, unknown> };
    statusCode = domainError.statusCode;
    errorCode = domainError.code;
    message = domainError.message;
    details = domainError.details;
  }
  // Validation errors (Zod)
  else if (err instanceof Error && err.name === 'ZodError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Invalid request data';
    details = (err as unknown as { errors: unknown[] }).errors as unknown as Record<string, unknown>;
  }
  // JWT errors
  else if (err instanceof Error && err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  else if (err instanceof Error && err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  // Database errors
  else if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
    statusCode = 409;
    errorCode = 'DUPLICATE_RESOURCE';
    message = 'Resource already exists';
  }
  else if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2025') {
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    message = 'Resource not found';
  }
  // Rate limiting errors
  else if (err && typeof err === 'object' && 'type' in err && (err as { type: string }).type === 'entity.too.large') {
    statusCode = 413;
    errorCode = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload too large';
  }
  // Timeout errors
  else if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ETIMEDOUT') {
    statusCode = 504;
    errorCode = 'GATEWAY_TIMEOUT';
    message = 'Request timeout';
  }
  // Default case for unknown errors
  else {
    statusCode = 500;
    errorCode = 'INTERNAL_SERVER_ERROR';
    message = process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : (err instanceof Error ? err.message : 'Unknown error');
  }

  // Send error response
  return res.status(statusCode).json({
    success: false,
    error: errorCode,
    message,
    details,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err instanceof Error ? err.stack : undefined,
      originalError: err instanceof Error ? err.message : 'Unknown error'
    })
  });
}

// Mount the global error handler
app.use(globalErrorHandler);

// 404 handler
app.use('*', (req: Request, res: Response) => {
  console.log(`📍 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'GET /ping',
      'GET /health',
      'GET /api/debug/*',
      'GET /api/test',
      'POST /api/kam/auth/login',
      'POST /api/kam/auth/register',
      'POST /api/kam/auth/logout',
      'GET  /api/kam/settings',
      '🏗️ DOMAIN API:',
      'POST /api/domains (← SAVE DOMAIN BUTTON!)',
      'GET /api/domains/my',
      'PUT /api/domains/:id',
      'DELETE /api/domains/:id',
      '🤖 KIP API:',
      'GET /api/kip/agents (← AGENTS REGISTRY!)',
      'POST /api/kip/agents (run/create agents)',
      'GET /api/kip/platform-keys',
      'GET /api/kip/user-keys',
      '📱 USER PROFILE:',
      'PUT /api/users/:id (update profile - FIXED!)',
      '🎨 THEME API:',
      'GET /api/themes/:id (get theme by ID)',
      '🔧 KAM SETTINGS:',
      'GET /api/kam/settings (user settings)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Keeper API Server (Domain-Enabled Version)');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 Railway Public Domain: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Not set'}`);
  console.log('🔗 Available routes:');
  console.log('  - GET  /');
  console.log('  - GET  /ping');
  console.log('  - GET  /health');
  console.log('  - GET  /api/debug (router)');
  console.log('  - POST /api/kam/auth/login');
  console.log('  - POST /api/kam/auth/register');
  console.log('  🏗️ DOMAIN FUNCTIONALITY RESTORED:');
  console.log('  - POST /api/domains (create domain - SAVE BUTTON WORKS!)');
  console.log('  - GET  /api/domains/my (list user domains)');
  console.log('  - PUT  /api/domains/:id (update domain)');
  console.log('  - GET  /api/domains/:id/permissions');
  console.log('  🤖 KIP API ENDPOINTS REGISTERED:');
  console.log('  - GET  /api/kip/agents (agents registry - FIXED!)');
  console.log('  - POST /api/kip/agents (run/create agents)');
  console.log('  - GET  /api/kip/platform-keys (admin keys)');
  console.log('  - GET  /api/kip/user-keys (user keys)');
  console.log('  📱 USER PROFILE ENDPOINTS:');
  console.log('  - PUT  /api/users/:id (update profile - FIXED!)');
  console.log('  🎨 THEME ENDPOINTS:');
  console.log('  - GET  /api/themes/:id (get theme by ID)');
  console.log('  🔧 KAM SETTINGS:');
  console.log('  - GET  /api/kam/settings (user settings)');
  console.log('\n✅ Domain Layer + KIP API + User Profile Updates + Theme API fully functional!\n');
});

server.on('error', (error: Error) => {
  const errorWithCode = error as Error & { code?: string };
  if (errorWithCode.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else if (errorWithCode.code === 'EACCES') {
    console.error(`❌ Permission denied to bind to port ${PORT}`);
  } else {
    console.error('❌ Server error:', error.message);
  }
  process.exit(1);
});

// Server is already started with app.listen() above 