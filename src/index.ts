import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
dotenv.config();
import settingsHandler from './api/kam/settings.js'; // NOTE: must end in .js when compiled
import { loginUserHandler } from './kam/auth/login.js';
import { registerUserHandler } from './kam/auth/register.js';
import { logRequestMiddleware } from './middleware/logRequestMiddleware.js';
import type { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Startup log
console.log('✅ Keeper backend server started');

const corsOptions = { origin: true, credentials: true };

// Handle OPTIONS preflight requests
app.options('*', cors(corsOptions));

// ✅ Parse incoming JSON bodies
app.use(express.json());

app.use(logRequestMiddleware);

// Simple test route to confirm routing and CORS
app.get('/api/test', cors(corsOptions), (req, res) => {
  res.json({ message: '✅ Test route working', origin: req.headers.origin });
});

// Auth routes
app.post('/api/kam/auth/register', cors(corsOptions), async (req, res) => {
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

app.options('/api/kam/auth/login', cors(corsOptions));
app.post('/api/kam/auth/login', cors(corsOptions), loginRouteHandler);

// Fallback debug handler
app.all('/api/kam/auth/login', cors(corsOptions), (req, res) => {
  res.status(200).json({ debug: true, method: req.method });
});

// Settings route
app.use('/api/kam/settings', cors(corsOptions), async (req, res) => {
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