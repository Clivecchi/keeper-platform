import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
dotenv.config();
import settingsHandler from './api/kam/settings.js'; // NOTE: must end in .js when compiled
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
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : process.env.NODE_ENV === 'production'
    ? ['https://v0-keeper.vercel.app']
    : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.log('CORS blocked request from origin:', origin);
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
  corsOriginsEnv: process.env.CORS_ORIGINS
});

// Log every incoming request (for debugging in Railway logs)
app.use((req, _res, next) => {
  console.log(`[IN] ${req.method} ${req.path}`);
  next();
});

// Apply CORS
app.use(cors(corsOptions));

// Explicit preflight handler for all API routes (covers nested paths)
app.options('/api/*', cors(corsOptions));

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

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.get('/debug/index-code', (req, res) => {
  const filePath = path.resolve('dist', 'index.js');
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.js:', err);
      return res.status(500).send('Error reading deployed index.js');
    }
    res.type('text/plain').send(data);
  });
});

console.log('✅ Keeper Express server starting...');
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}); 