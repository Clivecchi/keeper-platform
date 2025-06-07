import express from 'express';
import settingsHandler from './api/kam/settings.js'; // NOTE: must end in .js when compiled

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
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