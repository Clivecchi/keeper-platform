import express, { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { logger } from '@keeper/shared';

const router: ExpressRouter = Router();

// Debug endpoint for testing connectivity
router.post('/', (req, res) => {
  logger.info('Debug endpoint hit', { body: req.body });
  res.json({ 
    success: true, 
    message: 'Debug endpoint working',
    received: req.body,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    railway: {
      service: process.env.RAILWAY_SERVICE_NAME,
      environment: process.env.RAILWAY_ENVIRONMENT,
      deployment: process.env.RAILWAY_DEPLOYMENT_ID
    }
  });
});

// Railway logs endpoint - fetches comprehensive Railway debugging info
router.get('/railway-logs', async (req, res) => {
  logger.info('Railway logs endpoint hit');
  
  try {
    // Collect Railway environment information
    const railwayInfo = {
      service: process.env.RAILWAY_SERVICE_NAME,
      environment: process.env.RAILWAY_ENVIRONMENT,
      deployment: process.env.RAILWAY_DEPLOYMENT_ID,
      project: process.env.RAILWAY_PROJECT_ID,
      replica: process.env.RAILWAY_REPLICA_ID,
      public_domain: process.env.RAILWAY_PUBLIC_DOMAIN,
      private_domain: process.env.RAILWAY_PRIVATE_DOMAIN,
      git_branch: process.env.RAILWAY_GIT_BRANCH,
      git_commit: process.env.RAILWAY_GIT_COMMIT_SHA,
      all_railway_vars: Object.keys(process.env)
        .filter(k => k.startsWith('RAILWAY_'))
        .reduce((acc, key) => {
          acc[key] = process.env[key];
          return acc;
        }, {} as Record<string, string | undefined>)
    };

    // Get current process information
    const processInfo = {
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
      platform: process.platform,
      arch: process.arch
    };

    // Try to get Railway API token from environment (if available)
    const railwayToken = process.env.RAILWAY_TOKEN;
    let railwayApiData = null;

    if (railwayToken && process.env.RAILWAY_PROJECT_ID) {
      try {
        // Note: This would require Railway API token to be set in environment
        // For now, we'll just indicate whether we have the token
        railwayApiData = {
          hasToken: true,
          note: 'Railway API token available but not implemented yet'
        };
      } catch (error) {
        railwayApiData = {
          error: 'Failed to fetch from Railway API',
          details: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    } else {
      railwayApiData = {
        hasToken: false,
        note: 'No Railway API token available. Set RAILWAY_TOKEN environment variable to enable API access.'
      };
    }

    const debugData = {
      timestamp: new Date().toISOString(),
      railway: railwayInfo,
      process: processInfo,
      railwayApi: railwayApiData,
      server_status: 'running',
      port: process.env.PORT,
      node_env: process.env.NODE_ENV
    };

    res.json({
      success: true,
      data: debugData
    });

  } catch (error) {
    logger.error('Railway logs endpoint error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to collect Railway debug information',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 