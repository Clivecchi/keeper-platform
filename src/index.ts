import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import settingsHandler from './api/kam/settings.js'; // NOTE: must end in .js when compiled
import { loginUserHandler } from './kam/auth/login.js';
import { registerUserHandler } from './kam/auth/register.js';
import { logRequestMiddleware } from './middleware/logRequestMiddleware.js';
import type { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(logRequestMiddleware);

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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
}); 