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
const PORT = process.env.PORT || 3001;

// ✅ Startup log
console.log('✅ Keeper backend server started');

// 🚦 CORS setup
const getCorsOrigins = () => {
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
  
  // Split by comma and clean each origin
  const origins = envOrigins
    .split(',')
    .map(origin => origin.trim())
    .map(origin => origin.replace(/[;,]+$/, '')) // Remove trailing semicolons and commas
    .filter(origin => origin.length > 0); // Remove any empty strings
    
  console.log('Parsed CORS origins:', JSON.stringify(origins, null, 2));
  return origins;
};

const allowedOrigins = getCorsOrigins();

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      console.log('🔒 CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    console.log('🔒 CORS: Checking origin:', origin);
    console.log('🔒 CORS: Allowed origins:', allowedOrigins);
    
    if (allowedOrigins.includes(origin)) {
      console.log('🔒 CORS: Origin allowed');
      callback(null, true);
    } else {
      console.log('🔒 CORS: Origin blocked:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
};

// Log CORS configuration on startup
console.log('🔒 CORS Configuration:', {
  allowedOrigins,
  environment: process.env.NODE_ENV,
  port: process.env.PORT
});

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Explicit preflight handler for all API routes
app.options('*', cors(corsOptions));

// Log every incoming request (for debugging in Railway logs)
app.use((req, _res, next) => {
  console.log(`[IN] ${req.method} ${req.path} (Origin: ${req.headers.origin || 'none'})`);
  next();
});

// ✅ Parse incoming JSON bodies
app.use(express.json());

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
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}); 