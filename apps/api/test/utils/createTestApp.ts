import express from 'express';

/**
 * Create a basic test Express application for testing
 */
export async function createTestApp(): Promise<express.Application> {
  const app = express();
  app.use(express.json());

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
