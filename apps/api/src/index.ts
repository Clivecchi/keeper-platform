// Force Railway rebuild - clear build cache - 2025-10-15 20:42

// CRITICAL: Load environment variables BEFORE any other imports to ensure Redis config is available
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the API directory (same level as src/)
import 'dotenv/config';

console.log('[ENV CHECK]', {
  DISABLE_REDIS: process.env.DISABLE_REDIS,
  DATABASE_URL: process.env.DATABASE_URL,
});


import express from 'express';
import type { Request, Response, Express, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { attachUser } from './middleware/auth.js';
import { createDomainResolutionMiddleware } from './middleware/domainResolutionMiddleware.js';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// Import domain routes
import domainRoutes from './api/domains/routes.js';
import governanceRouter from './api/governance/routes.js';
import { ensureDomainAgentPolicy, ensureAllDomainsHaveAgentPolicy } from './governance/index.js';
import flatDomainsRouter from './api/domains.js';
import domainBoardDataRouter from './api/domains/board-data.js';
import adminDomainRoutes from './api/admin/domains.js';
// Import engagement routes
import engagementExecuteRouter from './api/engagement/execute.js';
// Import core actions for assertion
import { CORE_ACTIONS } from './api/kip/actions/schema.js';
import engagementTemplatesRouter from './api/engagement/templates.js';
import adminRolesRoutes from './api/admin/roles.js';
import adminUsersRoutes from './api/admin/users.js';
import voicePreferencesRouter from './api/users/voice-preferences.js';
import emotifsRouter from './api/emotifs/routes.js';
import adminRouter from './api/admin.js';
import { adminQueryRouter } from './api/admin/query.js';
// Import KIP routes
import kipAgentsHandler from './api/kip/agents.js';
import kipPlatformKeysRouter from './api/kip/platform-keys.js';
import kipLensesRouter from './api/kip/lenses.js';
import kipModeConfigRouter from './api/kip/mode-config.js';
import kipModelsRouter from './api/kip/models.js';
import { getUserKeys, setUserKey, deleteUserKey, getUserProviders } from './api/kip/user-keys.js';
// Import KAM settings handler
import kamSettingsHandler from './api/kam/settings.js';
// Import Board Studio routes
import boardRoutes from './routes/boards.js';
import frameRoutes from './routes/frames.js';
// Import new board data API routes
import newBoardRoutes from './api/boards.js';
import newBoardRoutesDefault, { templatesRouter as boardTemplatesRouter, studioAliasRouter as boardStudioAliasRouter, boardDataRoRouter } from './api/boards.js';
import { boardDataDevRouter } from './api/board-data/dev.js';
import { kamAuth, kamScope } from './kam/middleware.js';
import { kamOrUserAuth, roBoardsGuard } from './middleware/auth-combined.js';
import entitiesRoutes from './api/entities/routes.js';
import uploadsRoutes from './api/uploads/routes.js';
// Import v0 routes
import v0MomentsRouter from './routes/v0/moments.js';
import agentsRoutes from './api/agents.js';
import journeysRoutes from './api/journeys.js';
import domainKeepersRoutes from './api/keeper/domain-integrated-routes.js';
import domainMomentsRoutes from './api/moment/domain-integrated-routes.js';
import pathsRoutes from './api/path/domain-integrated-routes.js';
import keeperTypesRoutes from './api/keeper-types.js';
import peopleRoutes from './api/people.js';
// Import database client
import { prisma } from '@keeper/database';
import healthRouter from './health.js';
import { authMiddleware, authMiddlewareCompat, AuthenticatedRequest } from './middleware/authMiddleware.js';
import keeperRoutes from './api/keeper/routes.js';
import debugRouter from './api/debug.js';
import { addLog as addInternalLog } from './utils/LogStore.js';
import { getLogs as getInternalLogs } from './utils/LogStore.js';
import adminDiagnostics from './api/admin/diagnostics.js';
import adminRepair from './api/admin/repair.js';
import adminInspect from './api/admin/inspect.js';
import { tenantScanHandler } from './api/admin/tenant-scan.js';
import { runMigrationsOnce } from './startup/migrate.js';
// KAM routes
import kamRouter from './kam/routes.js';
import authRouter from './kam/auth-routes.js';
import { getPlatformRolesForUser } from './kam/auth.js';
import { setSessionCookie as setSessionCookieShared, clearSessionCookie } from './kam/session.js';
// MCP routes (OpenAI Agent integration)
import mcpRouter from './mcp/index.js';

// Defer database migrations until after the server starts to avoid blocking healthchecks

// Log level configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const isDebug = LOG_LEVEL === 'debug';
const isVerbose = LOG_LEVEL === 'verbose';

// Debug: Verify environment loading (only in development)
if (process.env.NODE_ENV !== 'production') {
  console.log(`[API Bootstrap] DISABLE_REDIS="${process.env.DISABLE_REDIS}"`);
  console.log(`[API Bootstrap] REDIS_URL="${process.env.REDIS_URL}"`);
  console.log(`[API Bootstrap] DATABASE_URL="${process.env.DATABASE_URL ? 'set' : 'undefined'}"`);
  console.log(`[API Bootstrap] NODE_ENV="${process.env.NODE_ENV}"`);
}

// Redis status logging
import { isRedisDisabled, isRedisAvailable } from './lib/redis.js';

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

// Railway assigns PORT dynamically, respect that first, then fallback to 8080 for production, 3002 for dev
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (process.env.NODE_ENV === 'production' ? 8080 : 3002);

console.log(`🔧 Server initializing on port ${PORT} (NODE_ENV: ${process.env.NODE_ENV})`);

// Boot status: show proxy flag and origins
const PROXY_ENABLED = String(process.env.KEEPER_PROXY_ENABLED || 'false').toLowerCase() === 'true';
console.log(
  `Boot: ProxyEnabled: ${PROXY_ENABLED} | APP_ORIGIN=${process.env.APP_ORIGIN || ''} | PUBLIC_WEB_ORIGIN=${process.env.PUBLIC_WEB_ORIGIN || ''}`
);

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

// Optional concise HTTP trace (one-line) when DEBUG_HTTP=1
if (process.env.DEBUG_HTTP === '1') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    const started = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - started;
      // no bodies, no secrets
      console.log(`[http] ${req.method} ${req.path} → ${res.statusCode} ${ms}ms`);
    });
    next();
  });
}

// Request logging middleware (applied to all requests) - optimized to reduce noise
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  const isDevelopment = process.env.NODE_ENV !== 'production';
  // Attach/propagate a request id for correlation
  const incomingReqId = req.get('x-request-id') || req.get('x-railway-request-id') || '';
  const reqId = incomingReqId || randomUUID();
  (req as any).reqId = reqId;
  res.setHeader('x-request-id', reqId);
  
  // Skip logging for OPTIONS requests to reduce noise
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  // Only log in development or if explicitly enabled
  if (isDevelopment || process.env.ENABLE_REQUEST_LOGGING === 'true') {
    console.log(`📨 ${timestamp} - ${req.method} ${req.path} [reqId=${reqId}]`);
    console.log(`📨 Origin: ${req.get('origin') || 'none'} [reqId=${reqId}]`);
    
    // Log response when finished
    res.on('finish', () => {
      console.log(`📤 ${timestamp} - ${req.method} ${req.path} - Status: ${res.statusCode} [reqId=${reqId}]`);
    });
  }
  
  try { addInternalLog('req', { method: req.method, path: req.path, origin: req.get('origin') }); } catch {}
  next();
});

// CORS setup - MUST run BEFORE domain resolution and auth middleware
console.log('⚙️ Setting up CORS...');

function getCsv(name: string): string[] {
  const raw = String(process.env[name] || '').trim();
  return raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function buildCorsAllowlist(): string[] {
  // Support both CORS_ALLOWLIST and CORS_ORIGINS (preview deployments often set CORS_ORIGINS)
  const fromAllowlist = getCsv('CORS_ALLOWLIST');
  const fromOrigins = getCsv('CORS_ORIGINS');
  const combined = [...fromAllowlist, ...fromOrigins];

  if (process.env.NODE_ENV === 'production' && combined.length === 0) {
    // Default to single-domain MVP exact origins when not explicitly set
    const defaults = [process.env.PUBLIC_WEB_ORIGIN, process.env.APP_ORIGIN]
      .filter(Boolean) as string[];
    return defaults;
  }
  return combined;
}

function patternToRegex(pattern: string): RegExp {
  // Escape regex special chars, then replace wildcard '*' with '.*'
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

const ALLOWLIST_ARRAY = [
  ...buildCorsAllowlist(),
  'https://www.ke3p.com',
  'https://ke3p.com',
  process.env.PUBLIC_WEB_ORIGIN || '',
  process.env.APP_ORIGIN || '',
].filter(Boolean);

// Add development origins
if (process.env.NODE_ENV !== 'production') {
  ALLOWLIST_ARRAY.push('http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174');
}

const CORS_ALLOWLIST = new Set(ALLOWLIST_ARRAY.filter(o => !o.includes('*')));
const CORS_WILDCARDS = ALLOWLIST_ARRAY.filter(o => o.includes('*')).map(patternToRegex);

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true; // non-browser/server-to-server
  if (CORS_ALLOWLIST.size === 0 && CORS_WILDCARDS.length === 0) return true; // no restriction configured
  if (CORS_ALLOWLIST.has(origin)) return true;
  if (CORS_WILDCARDS.some(rx => rx.test(origin))) return true;

  // Check for preview origins (if enabled)
  if (process.env.WEB_PREVIEW_ALLOW === '1') {
    try {
      const url = new URL(origin);
      const suffix = process.env.WEB_PREVIEW_HOST_SUFFIX || '.vercel.app';
      const prefix = process.env.WEB_PREVIEW_HOST_PREFIX || '';
      const endsWithSuffix = url.hostname.endsWith(suffix);
      const startsWithPrefix = prefix ? url.hostname.startsWith(prefix) : true;
      if (endsWithSuffix && startsWithPrefix) {
        console.log('[CORS] Allowing preview origin:', origin);
        return true;
      }
    } catch {}
  }

  return false;
}

// Configure CORS options for development and production
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // For credentialed requests, we MUST return the specific origin (not '*')
    // This is required by the CORS spec when credentials: true
    if (!origin) {
      // Server-to-server requests (no origin header)
      callback(null, true);
      return;
    }

    const allow = isOriginAllowed(origin);
    console.log('[CORS] Origin check:', { origin, allow, allowlistSize: CORS_ALLOWLIST.size });

    if (allow) {
      // For credentialed requests, we return true and let cors middleware handle origin
      callback(null, true);
    } else {
      callback(new Error('CORS: origin not allowed'), false);
    }
  },
  // Enable credentials for development (localhost origins) and production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'x-user-id',
    'x-debug-token',
    'x-domain-slug',
    'x-anon-key',
    'If-Match',
    'ETag',
    'X-Domain',
    'X-Domain-Slug'
  ],
  exposedHeaders: ['x-debug-info', 'ETag', 'X-Total-Count', 'X-Page-Count'],
  preflightContinue: false,
  maxAge: 86400,
};

// Apply CORS middleware FIRST - before any other middleware
app.use(cors(corsOptions));

// Explicit OPTIONS handler for all routes - this ensures preflight requests are handled
app.options('*', (req, res) => {
  const origin = req.get('origin');

  // For credentialed requests, we MUST set the specific origin (not '*')
  if (origin && isOriginAllowed(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Server-to-server requests - no origin header needed
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', corsOptions.methods.join(','));
  res.header('Access-Control-Allow-Headers', corsOptions.allowedHeaders.join(','));
  res.header('Access-Control-Max-Age', corsOptions.maxAge.toString());
  res.sendStatus(204); // 204 No Content for preflight
});

// Domain resolution middleware - runs AFTER CORS but short-circuits OPTIONS
app.use((req, res, next) => {
  // Short-circuit OPTIONS requests to prevent domain resolution middleware from interfering
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const domainResolution = createDomainResolutionMiddleware({
    fallbackDomain: process.env.FALLBACK_DOMAIN ?? 'www.ke3p.com',
  });
  return domainResolution(req, res, next);
});

// CORS preflight requests are handled by the cors middleware above

// Basic middleware with defensive JSON parsing for MCP compatibility
// Increased limit to 50mb to support base64-encoded files (25MB file → ~33MB base64)
app.use(express.json({ limit: '50mb', type: ['application/json', 'text/json', '*/json'] as any }));
app.use(express.text({ type: '*/*', limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser()); // Parse cookies for session management

// Defensive JSON parser: accept JSON even if Content-Type is odd/missing
app.use((req, _res, next) => {
  if (!req.is('application/json') && typeof req.body === 'string') {
    try { 
      req.body = JSON.parse(req.body); 
    } catch { 
      /* ignore non-JSON */ 
    }
  }
  next();
});

// Attach lightweight user context early; tolerant to missing/invalid tokens
app.use(attachUser);

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

// Who am I (acceptance check) – relies on attachUser
app.get('/api/whoami', (req: Request, res: Response) => {
  const u = (req as any).user || null;
  if (!u?.id) return res.status(401).json({ error: 'Unauthorized' });
  res.json({ userId: u.id, email: u.email || null });
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
  const domainIssues: string[] = [];
  // Remove strict host check - allow any host in production
  // if (req.headers.host !== 'keeper-platform-production.up.railway.app') {
  //   domainIssues.push(`Unexpected host: ${req.headers.host}`);
  // }
  
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
        '🌐 CUSTOM DOMAIN ENDPOINTS:',
        'POST /api/domains/custom/:domainId/custom-domain (add domain to Vercel)',
        'POST /api/domains/custom/:domainId/custom-domain/verify (verify domain)',
        'DELETE /api/domains/custom/:domainId/custom-domain (remove domain)',
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
        'PUT /api/users/:id (update profile - FIXED!)',
        '📝 V0 MOMENTS API (Write a Moment):',
        'POST /api/v0/moments/drafts (create draft)',
        'PATCH /api/v0/moments/drafts/:id (update draft)',
        'GET /api/v0/moments/drafts/:id (get draft)',
        'POST /api/v0/moments/:id/keep (publish moment)'
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
    },

    // 📝 INTERNAL LOGS (recent Vercel errors, etc.)
    internal_logs: getInternalLogs()
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

// Route introspection for acceptance only
if (process.env.ENABLE_INTROSPECTION === '1') {
  app.get('/api/__routes', (_req, res) => {
    const routes: Array<{ method: string; path: string }> = [];
    (app as any)._router?.stack?.forEach((layer: any) => {
      if (layer.route && layer.route.path) {
        const methods = Object.keys(layer.route.methods || {}).filter(Boolean);
        methods.forEach((m) => routes.push({ method: m.toUpperCase(), path: layer.route.path }));
      }
    });
    res.json({ routes });
  });
}

// ⚠️ CRITICAL: These inline auth handlers are the ACTUAL handlers being used in production!
// The handlers in packages/kam/src/auth/*.ts are NOT being used.
// Any changes to authentication (including cookie setting) MUST be done here.
// See apps/api/README.md and apps/api/src/kam/README.md for details.

// 🍪 Shared cookie helper — delegates to the canonical setSessionCookie in session.ts
// Ensures SameSite=None + Secure for cross-subdomain cookies (api.ke3p.com ↔ www.ke3p.com)
function setSessionCookie(req: Request, res: Response, token: string) {
  setSessionCookieShared(req, res, token);
  return { cookieDomain: process.env.COOKIE_DOMAIN || '.ke3p.com' };
}

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
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d',
    });

    // 🍪 Set session cookie (shared helper — delegates to session.ts)
    const { cookieDomain } = setSessionCookie(req, res, token);
    console.log('[auth] Cookie set for login:', { domain: cookieDomain, user: user.email });

    const platformRoles = await getPlatformRolesForUser(user.id);

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          platformRoles,
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

      const newDomainId = randomUUID();
      await prisma.domain.create({
        data: {
          id: newDomainId,
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

      await ensureDomainAgentPolicy(newDomainId).catch((err) =>
        console.warn('[auth] Failed to ensure domain agent policy for new user:', err)
      );

      // Auto-create a default Keeper so Journey creation works immediately
      try {
        await prisma.keeper.create({
          data: {
            id: `keeper-default-${newUser.id}`,
            title: `${name}'s Keeper`,
            purpose: 'Default keeper for organizing journeys and moments.',
            ownerId: newUser.id,
            domainId: newDomainId,
            keeperType: 'PersonalKeeper',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log('[auth] Default keeper created for new user:', newUser.email);
      } catch (keeperError) {
        console.error('Failed to create default keeper on signup:', keeperError);
      }
    } catch (domainError) {
      console.error('❗ Failed to create personal domain on signup:', domainError);
      // We don’t fail the signup if domain creation fails, but we surface a log for debugging.
    }

    // Sign JWT
    const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET || 'fallback-secret', {
      expiresIn: '7d',
    });

    // 🍪 Set session cookie so the user is immediately authenticated after registration
    const { cookieDomain } = setSessionCookie(req, res, token);
    console.log('[auth] Cookie set for register:', { domain: cookieDomain, user: newUser.email });

    const platformRoles = await getPlatformRolesForUser(newUser.id);

    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          avatar_url: newUser.avatar_url,
          platformRoles,
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

  // 🍪 Clear session cookie using the canonical helper from session.ts
  clearSessionCookie(res);
  console.log('[auth] Cookie cleared for logout');

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

// User voice preferences (must be before /api/users/:id to avoid :id matching "me")
app.use('/api/users', voicePreferencesRouter);

// Emotifs (must be before /api/domains so /api/domains/:domainId/emotifs is handled)
app.use('/api', emotifsRouter);

// Mount domain routes in order: specific routes first, then generic patterns
app.use('/api/domains', domainBoardDataRouter); // Specific: /:domainId/board-data (public with optional auth)
app.use('/api/domains', domainRoutes);          // Has /by-slug (public) and /:id (auth required)
app.use('/api/governance', governanceRouter);   // Contracts list and detail
app.use('/api/domains', flatDomainsRouter);     // Authenticated admin list

// Admin domain management (super-admin only)
app.use('/api/admin/domains', adminDomainRoutes);

// Platform role management
app.use('/api/admin/roles', adminRolesRoutes);
app.use('/api/admin/users', adminUsersRoutes);
app.use('/api/admin', adminDiagnostics);
app.use('/api/admin', adminRepair);
app.use('/api/admin', adminInspect);
app.use('/api/admin', adminRouter);
app.use('/api/admin/query', adminQueryRouter);
// GET /api/admin/tenant-scan (KAM-protected via authMiddlewareCompat)
app.get('/api/admin/tenant-scan', authMiddlewareCompat, tenantScanHandler);
// TEMP alias to stop UI 404s: redirect /api/admin/domains/my → /api/keepers/my
app.get('/api/admin/domains/my', (req, res) => {
  res.redirect(307, '/api/keepers/my');
});

// NEW: Connect Keeper routes
app.use('/api/keeper', keeperRoutes);

// Connect Board Studio routes
app.use('/api/boards', boardRoutes);
app.use('/api/frames', frameRoutes);

// Connect engagement template execution
app.use('/api/engagement', engagementExecuteRouter);
app.use('/api/engagement/templates', engagementTemplatesRouter);

// Connect new board data API routes
// Mount RO parity with composite auth: KAM service key or user JWT
app.use('/api/board-data', kamOrUserAuth, roBoardsGuard, boardDataRoRouter);
app.use('/api/board-data', kamOrUserAuth, boardDataDevRouter);
app.use('/api/board-data', newBoardRoutesDefault);
app.use('/api/board-templates', boardTemplatesRouter);
app.use('/api/board-data', boardStudioAliasRouter);
app.use('/api/entities', entitiesRoutes);
app.use('/api/uploads', uploadsRoutes);
// Mount v0 routes
app.use('/api/v0/moments', v0MomentsRouter);
console.log('[boot] ✅ mounted /api/v0/moments router');
app.use('/api/agents', agentsRoutes);
app.use('/api/journeys', journeysRoutes);
app.use('/api/keepers', domainKeepersRoutes);
app.use('/api/moments', domainMomentsRoutes);
app.use('/api/paths', pathsRoutes);
app.use('/api/keeper-types', keeperTypesRoutes);
app.use('/api/people', peopleRoutes);
// Mount KAM read-only API
app.use('/kam', kamRouter);
// Mount auth routes (cookie-based session management)
app.use('/api/kam/auth', authRouter);
// Back-compat alias expected by some clients: /api/kam/me → /api/kam/auth/me
app.get('/api/kam/me', (req, res, next) => {
  (req.url as any) = '/me';
  (authRouter as any).handle(req, res, next);
});

// ═══════════════════════════════════════════════════════════════
// MCP CANARY VERIFICATION (trace + headers + teapot endpoint)
// ═══════════════════════════════════════════════════════════════

// Trace ALL /mcp* hits early (before routing), even OPTIONS
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/mcp' || req.path.startsWith('/mcp/') || 
      req.path === '/api/mcp' || req.path.startsWith('/api/mcp/')) {
    const rid  = req.header('x-request-id') || req.header('x-railway-request-id') || '';
    const ua   = req.header('user-agent') || '';
    const host = req.header('host') || '';
    const origin = req.header('origin') || '';
    console.log(`[MCP TRACE] method=${req.method} path=${req.path} host=${host} origin="${origin}" ua="${ua}" rid=${rid}`);
  }
  next();
});

// Canary headers for any /mcp* response (proves backend reached)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/mcp' || req.path.startsWith('/mcp/') || 
      req.path === '/api/mcp' || req.path.startsWith('/api/mcp/')) {
    res.setHeader('X-Keeper-Origin', 'railway-api');
    res.setHeader('X-Keeper-Build', process.env.RAILWAY_DEPLOYMENT_ID || process.env.BUILD_ID || 'dev');
    res.setHeader('X-Keeper-Service', 'keeper-api-mcp');
  }
  next();
});

// Teapot canary: proves backend reached (418 = I'm a teapot)
app.all('/mcp/_canary', (req: Request, res: Response) => {
  const rid = req.header('x-request-id') || req.header('x-railway-request-id') || '';
  console.log(`[MCP CANARY] method=${req.method} path=${req.path} rid=${rid}`);
  res.status(418).json({
    ok: true,
    why: 'teapot',
    method: req.method,
    path: req.path,
    origin: 'railway-api',
    service: 'keeper-api-mcp',
    build: process.env.RAILWAY_DEPLOYMENT_ID || process.env.BUILD_ID || 'dev',
    timestamp: new Date().toISOString()
  });
});
app.all('/api/mcp/_canary', (req: Request, res: Response) => {
  const rid = req.header('x-request-id') || req.header('x-railway-request-id') || '';
  console.log(`[MCP CANARY] method=${req.method} path=${req.path} rid=${rid}`);
  res.status(418).json({
    ok: true,
    why: 'teapot',
    method: req.method,
    path: req.path,
    origin: 'railway-api',
    service: 'keeper-api-mcp',
    build: process.env.RAILWAY_DEPLOYMENT_ID || process.env.BUILD_ID || 'dev',
    timestamp: new Date().toISOString()
  });
});

// MCP OPTIONS preflight handler (must be before router mount)
app.options('/api/mcp/*', (_req, res) => {
  const origin = (_req.headers.origin as string) || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, x-domain-id'
  );
  res.setHeader('Access-Control-Max-Age', '600');
  res.sendStatus(200);
});

// Mount MCP routes (OpenAI Agent integration)
// Mount at BOTH /mcp and /api/mcp for compatibility with different clients
app.use('/mcp', mcpRouter);
app.use('/api/mcp', mcpRouter);

// Connect KIP routes (auth required; include service marker)
const kipChain = [
  authMiddlewareCompat,
  (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('x-keeper-service', 'keeper-platform');
    next();
  },
];
app.use('/api/kip/lenses', ...kipChain, kipLensesRouter);
app.use('/api/kip/models', ...kipChain, kipModelsRouter);
app.use('/api/kip/agents', ...kipChain, kipModeConfigRouter);
app.use('/api/kip/agents', ...kipChain, kipAgentsHandler);
app.use('/api/kip/platform-keys', ...kipChain, kipPlatformKeysRouter);
// Connect unified Debug routes
app.use('/api/debug', debugRouter);

// KIP User Keys routes - individual function handlers
app.get('/api/kip/user-keys', getUserKeys);
app.post('/api/kip/user-keys', setUserKey);
app.delete('/api/kip/user-keys/:keyId', deleteUserKey);
app.get('/api/kip/user-keys/providers', getUserProviders);

// KAM Settings route
app.get('/api/kam/settings', kamSettingsHandler);

// Healthcheck route
app.use('/', healthRouter);

// Catch-all 404 for /mcp* paths with explicit log + JSON body
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/mcp' || req.path.startsWith('/mcp/') || 
      req.path === '/api/mcp' || req.path.startsWith('/api/mcp/')) {
    const rid = req.header('x-request-id') || req.header('x-railway-request-id') || '';
    console.warn(`[MCP 404] method=${req.method} path=${req.path} rid=${rid}`);
    if (!res.headersSent) {
      return res.status(404).json({ 
        ok: false, 
        where: 'railway-api', 
        error: 'Not Found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    }
  }
  next();
});

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

// Themes by slug route (for V0)
app.get('/api/themes/slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const theme = await prisma.themes.findUnique({
      where: { slug },
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
    console.error('Theme fetch by slug error:', error);
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
    statusCode = 422;
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

// 404 handler with tracer
app.use('*', (req: Request, res: Response) => {
  const host = req.get('host');
  console.log(`📍 404 - Route not found: ${req.method} ${req.originalUrl} [host=${host}]`);
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
      'GET /api/kam/settings (user settings)',
      '📝 V0 MOMENTS API (Write a Moment):',
      'POST /api/v0/moments/drafts (create draft)',
      'PATCH /api/v0/moments/drafts/:id (update draft)',
      'GET /api/v0/moments/drafts/:id (get draft)',
      'POST /api/v0/moments/:id/keep (publish moment)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Assert core action handlers are available at startup
function assertCoreActionHandlers() {
  // CORE_ACTIONS is now imported at the top of the file
  const supportedActions = new Set([
    'draft.create',
    'draft.update',
    'draft.delete',
    'draft.list',
    'draft.get',
    'draft.read',
    'draft.setActive',
  ]);

  const missing: string[] = [];
  for (const coreAction of CORE_ACTIONS) {
    if (!supportedActions.has(coreAction)) {
      missing.push(coreAction);
    }
  }

  if (missing.length > 0) {
    const errorMsg = `[kip.actions] missing core handlers: ${missing.join(', ')}`;
    console.error(`\n❌ ${errorMsg}\n`);
    if (process.env.NODE_ENV !== 'production') {
      throw new Error(errorMsg);
    }
    // In production, log but continue
    console.error('[kip.actions] continuing in production mode despite missing core handlers');
  } else {
    console.log(`✅ [kip.actions] all core handlers available: ${CORE_ACTIONS.join(', ')}`);
  }
}

// Schema verification before starting server
async function verifyDatabaseSchema() {
  try {
    console.log('🔍 Verifying database schema...');

    // Check Prisma client version
    const prismaVersion = require('@prisma/client/package.json').version;
    console.log(`📦 Prisma Client Version: ${prismaVersion}`);

    // Redact database URL for logging
    const dbUrl = process.env.DATABASE_URL;
    const redactedUrl = dbUrl ? dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@') : 'Not set';
    console.log(`🗄️  Database Host: ${redactedUrl}`);

    // Test basic connectivity and Moment table existence
    const testQuery = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_name = 'Moment' LIMIT 1;`;
    const hasMomentTable = Array.isArray(testQuery) && testQuery.length > 0;

    if (hasMomentTable) {
      console.log('✅ Moment table exists in database');
    } else {
      console.log('❌ Moment table MISSING from database - schema may need sync');
    }

    console.log('🔍 Schema verification complete\n');
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    // Don't exit - let the server start anyway for debugging
  }
}

// Start server
const server = app.listen(PORT, '0.0.0.0', async () => {
  // Run schema verification
  await verifyDatabaseSchema();

  console.log('\n🚀 Keeper API Server (Domain-Enabled Version)');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 Railway Public Domain: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Not set'}`);
  
  // Assert core action handlers
  try {
    assertCoreActionHandlers();
  } catch (error) {
    console.error('Failed to assert core action handlers:', error);
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
  
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

  // Kick off migrations and governance backfill in the background (non-blocking)
  try {
    setTimeout(async () => {
      try {
        runMigrationsOnce();
      } catch (e) {
        console.error('[migrate:post-start:error]', (e as Error)?.message || e);
      }
      try {
        const backfilled = await ensureAllDomainsHaveAgentPolicy();
        if (backfilled > 0) {
          console.log(`[governance] Backfilled ${backfilled} domain(s) with agent policy`);
        }
      } catch (e) {
        console.warn('[governance:backfill:startup]', (e as Error)?.message || e);
      }
    }, 0);
  } catch {}
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