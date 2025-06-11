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

// ✅ Respond to all CORS preflight requests
app.options('*', cors());

// ✅ Enable actual CORS for all methods
app.use(cors({ origin: true, credentials: true }));

// ✅ Parse incoming JSON bodies
app.use(express.json());

// ✅ Startup log
console.log('✅ Keeper backend server started');

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