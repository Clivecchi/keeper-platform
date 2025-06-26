// MINIMAL RAILWAY TEST SERVER
console.log('🚀 Starting minimal Railway test...');

import express from 'express';

const app = express();

// Log environment info
console.log('PORT from Railway:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Railway Service:', process.env.RAILWAY_SERVICE_NAME);

// Use Railway's PORT or fallback
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
console.log('Using PORT:', PORT);

// Simple endpoints
app.get('/ping', (req, res) => {
  console.log('Ping received');
  res.json({ message: 'pong', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  console.log('Health check received');
  res.json({ status: 'healthy', port: PORT });
});

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  res.json({ message: 'Railway test server is running!' });
});

// Start server with IPv6 binding
console.log(`Attempting to start server on [::]:${PORT}...`);

const server = app.listen(PORT, '::', () => {
  console.log(`✅ Server started successfully on [::]:${PORT}`);
  console.log('Server address:', server.address());
});

server.on('error', (error: any) => {
  console.error('❌ Server error:', error);
  process.exit(1);
});

console.log('🚀 Minimal test server setup complete'); 