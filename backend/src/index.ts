import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
dotenv.config();
import settingsHandler from './api/kam/settings.js';
import { loginUserHandler } from './kam/auth/login.js';
import { registerUserHandler } from './kam/auth/register.js';
import { logRequestMiddleware } from './middleware/logRequestMiddleware.js';
import type { Request, Response } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ✅ Startup log
console.log('✅ Keeper backend server started');
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
  next();
});

// ✅ Parse incoming JSON bodies
console.log('9️⃣ Setting up JSON parsing...');
app.use(express.json());
console.log('🔟 JSON parsing setup complete');

app.use(logRequestMiddleware);

// Simple test route to confirm routing and CORS
app.get('/api/test', (req, res) => {
  res.json({ message: '✅ Test route working', origin: req.headers.origin });
});

// Auth routes
app.post('/api/kam/auth/register', async (req, res) => {
  try {
    const result = await registerUserHandler(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('Register handler error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

const loginRouteHandler = async (req: Request, res: Response) => {
  console.log('🔐 Login route hit');
  try {
    const result = await loginUserHandler(req.body);
    res.status(result.success ? 200 : 401).json(result);
  } catch (err) {
    console.error('Login handler error:', err);
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

console.log('✅ Keeper Express server starting...');
console.log('🔧 Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  HOST: process.env.HOST || '0.0.0.0'
});

console.log('🚀 Attempting to start server...');
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully bound to port ${PORT}`);
  console.log(`📡 Accepting connections on all interfaces (0.0.0.0)`);
}); 