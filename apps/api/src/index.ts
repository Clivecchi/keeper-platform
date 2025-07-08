import express from 'express';
import type { Request, Response, Express } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app: Express = express();

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

// Request logging middleware (applied to all requests)
app.use((req: Request, res: Response, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📨 ${timestamp} - ${req.method} ${req.path}`);
  console.log(`📨 Origin: ${req.get('origin') || 'none'}`);
  console.log(`📨 User-Agent: ${req.get('user-agent') || 'none'}`);
  console.log(`📨 Headers:`, JSON.stringify(req.headers, null, 2));
  
  // Log response when finished
  res.on('finish', () => {
    console.log(`📤 ${timestamp} - ${req.method} ${req.path} - Status: ${res.statusCode}`);
  });
  
  next();
});

// CORS setup with detailed logging
console.log('⚙️ Setting up CORS...');
app.use(cors({
  origin: function(origin, callback) {
    console.log(`🌐 CORS check for origin: ${origin || 'none'}`);
    
    const allowedOrigins = [
      'http://localhost:5173', 
      'https://keeper-platform-hm1kukq25-clivecchis-projects.vercel.app',
      'https://v0-keeper.vercel.app',
      'https://keeper-platform.vercel.app'
    ];
    
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) {
      console.log('✅ CORS: No origin - allowing');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin allowed');
      return callback(null, true);
    }
    
    // For debugging, allow all origins temporarily
    console.log('⚠️ CORS: Origin not in allowed list, but allowing for debugging');
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id', 'x-debug-token'],
  exposedHeaders: ['x-debug-info']
}));

// Handle preflight requests explicitly
app.options('*', (req, res) => {
  console.log(`📋 CORS preflight for: ${req.method} ${req.path}`);
  res.header('Access-Control-Allow-Origin', req.get('origin') || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-user-id,x-debug-token');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.status(200).json({ message: 'CORS preflight OK' });
});

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

// 🔧 DEBUG ENDPOINTS - Global Access for Troubleshooting

// Comprehensive debug endpoint
app.get('/debug', (req, res) => {
  console.log('🔍 /debug endpoint hit - comprehensive system info');
  
  const debugInfo = {
    timestamp: new Date().toISOString(),
    server: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      pid: process.pid,
      cwd: process.cwd()
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      RAILWAY_SERVICE_NAME: process.env.RAILWAY_SERVICE_NAME,
      RAILWAY_DEPLOYMENT_ID: process.env.RAILWAY_DEPLOYMENT_ID,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_PRIVATE_DOMAIN: process.env.RAILWAY_PRIVATE_DOMAIN
    },
    request: {
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      headers: req.headers,
      query: req.query,
      ip: req.ip,
      ips: req.ips
    },
    cors: {
      origin: req.get('origin'),
      referer: req.get('referer'),
      host: req.get('host')
    }
  };
  
  res.header('x-debug-info', 'comprehensive');
  res.json(debugInfo);
});

// Simple debug endpoint for quick testing
app.get('/debug/simple', (req, res) => {
  console.log('🔍 /debug/simple endpoint hit');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    message: 'Simple debug endpoint working',
    origin: req.get('origin')
  });
});

// Test CORS specifically
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

// Catch-all error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('❌ Error caught by handler:', err.message);
  console.error('❌ Stack:', err.stack);
  console.error('❌ Request:', req.method, req.path);
  
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

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
      'GET /debug',
      'GET /debug/simple',
      'GET /debug/cors',
      'POST /debug/test-connection',
      'GET /railway-status',
      'GET /api/test'
    ],
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n🚀 Keeper API Server (Debug-Enhanced Version)');
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`🔗 Railway Public Domain: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'Not set'}`);
  console.log('🔗 Available routes:');
  console.log('  - GET  /');
  console.log('  - GET  /ping');
  console.log('  - GET  /health');
  console.log('  - GET  /debug (comprehensive)');
  console.log('  - GET  /debug/simple');
  console.log('  - GET  /debug/cors');
  console.log('  - POST /debug/test-connection');
  console.log('  - GET  /railway-status');
  console.log('  - GET  /api/test');
  console.log('\n✅ Ready for Railway deployment with debug endpoints!\n');
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

export default app; 