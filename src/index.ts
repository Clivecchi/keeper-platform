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
import {
  getBoardsHandler,
  getBoardHandler,
  createBoardHandler,
  updateBoardHandler,
  deleteBoardHandler,
  getFrameConfigsHandler,
  createFrameConfigHandler,
  getFrameInstancesHandler,
  createFrameInstanceHandler,
  createFrameContentHandler,
} from './api/boards.js';
import type { Request, Response } from 'express';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Startup log
console.log('✅ Keeper backend server started');
console.log('🌐 Allowed CORS origins:', allowedOrigins);

// CORS configuration
const allowedOrigins = [
  'https://keeper-platform-lzebaybul-clivecchis-projects.vercel.app',
  'https://keeper-platform-production.up.railway.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001'
];

// Add any additional origins from environment variables
if (process.env.ALLOWED_ORIGINS) {
  allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
}

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

// ✅ Parse incoming JSON bodies
app.use(express.json());

app.use(logRequestMiddleware);

// CORS debugging middleware
app.use((req, res, next) => {
  console.log('🌐 Request origin:', req.headers.origin);
  console.log('🌐 Request method:', req.method);
  console.log('🌐 Request path:', req.path);
  next();
});

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

// Fallback debug handler
app.all('/api/kam/auth/login', (req, res) => {
  res.status(200).json({ debug: true, method: req.method });
});

// Settings route
app.use('/api/kam/settings', async (req, res) => {
  try {
    await settingsHandler(req, res);
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Board API routes
app.get('/api/boards', async (req, res) => {
  try {
    await getBoardsHandler(req, res);
  } catch (err) {
    console.error('Get boards error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/api/boards/:id', async (req, res) => {
  try {
    await getBoardHandler(req, res);
  } catch (err) {
    console.error('Get board error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/api/boards', async (req, res) => {
  try {
    await createBoardHandler(req, res);
  } catch (err) {
    console.error('Create board error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.patch('/api/boards/:id', async (req, res) => {
  try {
    await updateBoardHandler(req, res);
  } catch (err) {
    console.error('Update board error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.delete('/api/boards/:id', async (req, res) => {
  try {
    await deleteBoardHandler(req, res);
  } catch (err) {
    console.error('Delete board error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Frame Config routes
app.get('/api/frames/configs', async (req, res) => {
  try {
    await getFrameConfigsHandler(req, res);
  } catch (err) {
    console.error('Get frame configs error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/api/frames/configs', async (req, res) => {
  try {
    await createFrameConfigHandler(req, res);
  } catch (err) {
    console.error('Create frame config error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Frame Instance routes
app.get('/api/frames/instances/entity/:entityType/:entityId', async (req, res) => {
  try {
    await getFrameInstancesHandler(req, res);
  } catch (err) {
    console.error('Get frame instances error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.get('/api/frames/instances/board/:boardId', async (req, res) => {
  try {
    await getFrameInstancesHandler(req, res);
  } catch (err) {
    console.error('Get frame instances error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

app.post('/api/frames/instances', async (req, res) => {
  try {
    await createFrameInstanceHandler(req, res);
  } catch (err) {
    console.error('Create frame instance error:', err);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Frame Content routes
app.post('/api/frames/content', async (req, res) => {
  try {
    await createFrameContentHandler(req, res);
  } catch (err) {
    console.error('Create frame content error:', err);
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