import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { logger } from '@keeper/shared';
import { prisma } from '@keeper/database';
import { randomUUID } from 'crypto';
import { ModelProviderService } from '../services/ModelProviderService.js';
import type { ModelProvider } from '@keeper/database';
import { authMiddlewareCompat, optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import { requireDomainReadCompat } from '../middleware/domainPermissionMiddleware.js';

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

// Railway status endpoint
router.get('/railway-status', (req, res) => {
  logger.info('Railway status endpoint hit');
  res.json({
    success: true,
    message: '✅ Railway API is responding',
    railway_info: {
      service: process.env.RAILWAY_SERVICE_NAME || 'unknown',
      environment: process.env.RAILWAY_ENVIRONMENT || 'unknown',
      deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'unknown',
      public_domain: process.env.RAILWAY_PUBLIC_DOMAIN || 'not_set',
      private_domain: process.env.RAILWAY_PRIVATE_DOMAIN || 'not_set',
      port: process.env.PORT || 'not_set',
      node_env: process.env.NODE_ENV || 'not_set'
    },
    server_info: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node_version: process.version,
      platform: process.platform
    },
    timestamp: new Date().toISOString()
  });
});

// Form submission debug endpoint
router.post('/form-debug', (req, res) => {
  logger.info('Form debug endpoint hit', { 
    body: req.body,
    headers: req.headers,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString()
  });
  
  res.json({
    success: true,
    message: 'Form debug data received',
    received_data: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'authorization': req.headers.authorization ? 'Bearer ***' : 'none',
      'user-agent': req.headers['user-agent']
    },
    server_info: {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    }
  });
});

// Database connectivity test endpoint
router.get('/database', async (req, res) => {
  logger.info('Database test endpoint hit');
  
  try {
    // Test basic database connection
    const startTime = Date.now();
    
    // Test a simple query
    const userCount = await prisma.users.count();
    const kipAgentCount = await prisma.kip_agents.count();
    
    // Test UUID generation in database
    const testUUID = randomUUID();
    logger.info('Generated test UUID:', testUUID);
    
    // Test if we can validate UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isValidUUID = uuidPattern.test(testUUID);
    
    // Test database table existence
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('kip_platform_keys', 'kip_user_keys', 'users')
    `;
    
    const responseTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: {
        database_connection: 'OK',
        response_time_ms: responseTime,
        counts: {
          users: userCount,
          kip_agents: kipAgentCount
        },
        uuid_test: {
          generated: testUUID,
          is_valid: isValidUUID,
          length: testUUID.length
        },
        tables_found: tables,
        prisma_version: '6.7.0', // This should match the version in package.json
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('Database test error:', error);
    res.status(500).json({
      success: false,
      error: 'Database connectivity test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
});

// UUID validation and testing endpoint
router.post('/uuid-test', async (req, res) => {
  logger.info('UUID test endpoint hit', { body: req.body });
  
  try {
    const { testUUID, userID, testString } = req.body;
    
    // Generate a new UUID for testing
    const newUUID = randomUUID();
    
    // Test various UUID validation scenarios
    const tests = {
      generated_uuid: {
        value: newUUID,
        is_valid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(newUUID),
        length: newUUID.length
      },
      client_uuid: {
        value: testUUID,
        is_valid: testUUID ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testUUID) : false,
        length: testUUID ? testUUID.length : 0
      },
      user_id: {
        value: userID,
        is_valid: userID ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userID) : false,
        length: userID ? userID.length : 0,
        type: typeof userID
      },
      invalid_string: {
        value: testString,
        is_valid: testString ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(testString) : false,
        length: testString ? testString.length : 0
      }
    };
    
    // Test database UUID operations
    let databaseTest: Record<string, unknown> | null = null;
    try {
      // Try to create a test record with the generated UUID
      // We'll use the users table for testing since it has a string ID field
      const testRecord = await prisma.$queryRaw`
        SELECT '${newUUID}'::uuid as test_uuid_cast
      `;
      
      databaseTest = {
        uuid_cast_test: 'SUCCESS',
        result: testRecord,
        platform_key_tests: []
      };
      
      // Test the specific issue: try to create a platform key with various UUID values
      const platformKeyTests = [];
      
      // Test with valid UUID
      try {
        await prisma.$queryRaw`
          SELECT '${newUUID}' as created_by, 'openai' as provider 
          WHERE '${newUUID}'::uuid IS NOT NULL
        `;
        platformKeyTests.push({ uuid: newUUID, status: 'VALID' });
      } catch (err) {
        platformKeyTests.push({ 
          uuid: newUUID, 
          status: 'ERROR', 
          error: err instanceof Error ? err.message : 'Unknown error' 
        });
      }
      
      // Test with user ID if provided
      if (userID) {
        try {
          await prisma.$queryRaw`
            SELECT '${userID}' as created_by, 'openai' as provider 
            WHERE '${userID}'::uuid IS NOT NULL
          `;
          platformKeyTests.push({ uuid: userID, status: 'VALID' });
        } catch (err) {
          platformKeyTests.push({ 
            uuid: userID, 
            status: 'ERROR', 
            error: err instanceof Error ? err.message : 'Unknown error' 
          });
        }
      }
      
      databaseTest.platform_key_tests = platformKeyTests;
      
    } catch (error) {
      databaseTest = {
        uuid_cast_test: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
    
    res.json({
      success: true,
      data: {
        tests,
        database_test: databaseTest,
        recommendations: {
          user_id_issue: !tests.user_id.is_valid ? 'User ID is not a valid UUID format' : null,
          fix_suggestion: !tests.user_id.is_valid ? 'Consider using crypto.randomUUID() or handling null values in created_by field' : null
        },
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('UUID test error:', error);
    res.status(500).json({
      success: false,
      error: 'UUID test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
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

/**
 * POST /api/debug/model-provider-test
 * Test the ModelProviderService directly
 */
router.post('/model-provider-test', async (req, res) => {
  try {
    const { provider, messages, userId } = req.body;
    
    if (!provider || !messages) {
      return res.status(400).json({
        success: false,
        error: 'Provider and messages are required'
      });
    }

    console.log(`[Debug] Testing ModelProviderService with provider: ${provider}, userId: ${userId}`);
    
    // Get default settings for the provider
    const settings = ModelProviderService.getDefaultSettings(provider as ModelProvider);
    
    // Test the model call
    const result = await ModelProviderService.callModel({
      messages,
      settings,
      provider: provider as ModelProvider,
      userId
    });
    
    return res.json({
      success: true,
      data: {
        modelResponse: result,
        testSettings: settings,
        provider,
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Model provider test error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/debug/fix-database
 * Fix common database issues: add missing agents, activate platform keys
 */
router.post('/fix-database', async (req, res) => {
  try {
    const fixes: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      actions: [],
      errors: []
    };

    // Check if kip agent exists
    const kipAgent = await prisma.kip_agents.findFirst({
      where: { slug: 'kip' }
    });

    if (!kipAgent) {
      // Insert the kip Lead agent
      try {
        const newKipAgent = await prisma.kip_agents.create({
          data: {
            slug: 'kip',
            name: 'Kip',
            purpose: 'Your intelligent assistant for thought processing, idea organization, and creative collaboration. Kip helps you capture insights, analyze patterns, and coordinate tasks across the Keeper platform.',
            model: 'claude-3-5-sonnet-20241022',
            agent_class: 'Lead',
            context_scope: 'user_interaction',
            memory_enabled: true,
            tools: ['thought_analysis', 'idea_organization', 'task_coordination', 'conversation'],
            permissions: ['read_user_data', 'create_memories', 'coordinate_agents', 'access_platform'],
            config: {
              tagline: 'Your AI companion for thoughts and ideas',
              personality: 'helpful, insightful, organized',
              capabilities: ['thought processing', 'idea organization', 'task coordination'],
              avatar: '🤖',
              theme_color: '#3b82f6'
            },
            status: 'ready',
            model_provider: 'anthropic',
            model_settings: {
              model: 'claude-3-5-sonnet-20241022',
              temperature: 0.7,
              max_tokens: 4000,
              retry: { max_retries: 3, retry_delay_ms: 1000 }
            }
          }
        });
        if (fixes && typeof fixes === 'object' && 'actions' in fixes && Array.isArray((fixes as any).actions)) {
          (fixes as any).actions.push({
            action: 'created_kip_agent',
            success: true,
            agent_id: newKipAgent.id,
            message: 'Created missing Kip Lead agent'
          });
        }
      } catch (error) {
        if (fixes && typeof fixes === 'object' && 'errors' in fixes && Array.isArray((fixes as any).errors)) {
          (fixes as any).errors.push({
            action: 'create_kip_agent',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } else {
      if (fixes && typeof fixes === 'object' && 'actions' in fixes && Array.isArray((fixes as any).actions)) {
        (fixes as any).actions.push({
          action: 'kip_agent_exists',
          success: true,
          agent_id: kipAgent.id,
          message: 'Kip agent already exists'
        });
      }
    }

    // Check if ceox agent exists
    const ceoxAgent = await prisma.kip_agents.findFirst({
      where: { slug: 'ceox' }
    });

    if (!ceoxAgent) {
      try {
        const newCeoxAgent = await prisma.kip_agents.create({
          data: {
            slug: 'ceox',
            name: 'CeoX',
            purpose: 'Executive AI assistant specialized in strategic thinking, business analysis, and leadership support. CeoX provides high-level insights, strategic recommendations, and executive decision support.',
            model: 'gpt-4o',
            agent_class: 'Lead',
            context_scope: 'executive',
            memory_enabled: true,
            tools: ['strategic_analysis', 'business_intelligence', 'decision_support', 'leadership_coaching'],
            permissions: ['access_business_data', 'generate_reports', 'strategic_planning', 'executive_support'],
            config: {
              tagline: 'Your strategic AI executive partner',
              personality: 'strategic, analytical, decisive',
              capabilities: ['strategic analysis', 'business intelligence', 'executive coaching'],
              avatar: '👔',
              theme_color: '#dc2626'
            },
            status: 'ready',
            model_provider: 'openai',
            model_settings: {
              model: 'gpt-4o',
              temperature: 0.7,
              max_tokens: 3000,
              top_p: 0.9,
              retry: { max_retries: 3, retry_delay_ms: 1500 }
            }
          }
        });
        if (fixes && typeof fixes === 'object' && 'actions' in fixes && Array.isArray((fixes as any).actions)) {
          (fixes as any).actions.push({
            action: 'created_ceox_agent',
            success: true,
            agent_id: newCeoxAgent.id,
            message: 'Created missing CeoX Lead agent'
          });
        }
      } catch (error) {
        if (fixes && typeof fixes === 'object' && 'errors' in fixes && Array.isArray((fixes as any).errors)) {
          (fixes as any).errors.push({
            action: 'create_ceox_agent',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    } else {
      if (fixes && typeof fixes === 'object' && 'actions' in fixes && Array.isArray((fixes as any).actions)) {
        (fixes as any).actions.push({
          action: 'ceox_agent_exists',
          success: true,
          agent_id: ceoxAgent.id,
          message: 'CeoX agent already exists'
        });
      }
    }

    // Activate platform keys
    try {
      const updatedKeys = await prisma.kip_platform_keys.updateMany({
        where: { is_active: false },
        data: { is_active: true, updated_at: new Date() }
      });
      
      if (updatedKeys.count > 0) {
        if (fixes && typeof fixes === 'object' && 'actions' in fixes && Array.isArray((fixes as any).actions)) {
          (fixes as any).actions.push({
            action: 'activated_platform_keys',
            success: true,
            count: updatedKeys.count,
            message: `Activated ${updatedKeys.count} platform keys`
          });
        }
      } else {
        if (fixes && typeof fixes === 'object' && 'actions' in fixes && Array.isArray((fixes as any).actions)) {
          (fixes as any).actions.push({
            action: 'platform_keys_already_active',
            success: true,
            message: 'Platform keys were already active'
          });
        }
      }
    } catch (error) {
      if (fixes && typeof fixes === 'object' && 'errors' in fixes && Array.isArray((fixes as any).errors)) {
        (fixes as any).errors.push({
          action: 'activate_platform_keys',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.json({
      success: true,
      data: fixes
    });
  } catch (error) {
    console.error('Database fix error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});



/**
 * POST /api/debug/fix-kip-provider
 * Fix Kip agent to use OpenAI instead of Anthropic
 */
router.post('/fix-kip-provider', async (req, res) => {
  try {
    console.log('[Debug] Fixing Kip agent to use OpenAI provider...');
    
    // Find Kip agent
    const kipAgent = await prisma.kip_agents.findFirst({
      where: { slug: 'kip' }
    });
    
    if (!kipAgent) {
      return res.status(404).json({
        success: false,
        error: 'Kip agent not found'
      });
    }
    
    console.log('[Debug] Found Kip agent:', kipAgent.name, 'Current provider:', kipAgent.model_provider);
    
    // Update Kip to use OpenAI
    const updatedKip = await prisma.kip_agents.update({
      where: { id: kipAgent.id },
      data: {
        model_provider: 'openai',
        model: 'gpt-4o',
        model_settings: {
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 4000,
          retry: {
            max_retries: 3,
            retry_delay_ms: 1000
          }
        },
        updated_at: new Date()
      }
    });
    
    console.log('[Debug] Updated Kip agent successfully');
    
    return res.status(200).json({
      success: true,
      data: {
        message: 'Kip agent updated to use OpenAI',
        agent: {
          id: updatedKip.id,
          name: updatedKip.name,
          slug: updatedKip.slug,
          old_provider: kipAgent.model_provider,
          new_provider: updatedKip.model_provider,
          old_model: kipAgent.model,
          new_model: updatedKip.model
        }
      }
    });
    
  } catch (error) {
    console.error('[Debug] Error fixing Kip provider:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fix Kip provider'
    });
  }
});

/**
 * POST /api/debug/vercel-test
 * Test Vercel API integration
 */
router.post('/vercel-test', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    // Check Vercel configuration
    const vercelConfig = {
      token: process.env.VERCEL_TOKEN ? '***HIDDEN***' : undefined,
      projectId: process.env.VERCEL_PROJECT_ID,
      hasToken: !!process.env.VERCEL_TOKEN,
      hasProjectId: !!process.env.VERCEL_PROJECT_ID
    };

    // Import the Vercel service
    const { VercelDomainManagerService } = await import('../services/VercelDomainManagerService.js');
    
    // Initialize service
    const vercelService = new VercelDomainManagerService(
      process.env.VERCEL_TOKEN || '',
      process.env.VERCEL_PROJECT_ID || ''
    );

    // Test domain addition
    console.log('[Debug] Testing Vercel domain addition:', domain);
    const addResult = await vercelService.addDomain(domain);

    return res.json({
      success: true,
      data: {
        vercel_config: vercelConfig,
        test_results: {
          domain_addition: {
            success: true,
            dns_records: addResult.dnsRecords
          }
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Debug] Vercel test error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test Vercel integration',
      vercel_config: {
        token: process.env.VERCEL_TOKEN ? '***HIDDEN***' : undefined,
        projectId: process.env.VERCEL_PROJECT_ID,
        hasToken: !!process.env.VERCEL_TOKEN,
        hasProjectId: !!process.env.VERCEL_PROJECT_ID
      }
    });
  }
});

/**
 * POST /api/debug/test-dns-status
 * Test DNS status for a specific domain
 */
router.post('/test-dns-status', async (req, res) => {
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({
        success: false,
        error: 'Domain is required'
      });
    }

    console.log('[Debug] Testing DNS status for domain:', domain);

    // Check Vercel configuration
    const vercelConfig = {
      token: process.env.VERCEL_TOKEN ? '***HIDDEN***' : undefined,
      projectId: process.env.VERCEL_PROJECT_ID,
      hasToken: !!process.env.VERCEL_TOKEN,
      hasProjectId: !!process.env.VERCEL_PROJECT_ID
    };

    // Import the Vercel service
    const { VercelDomainManagerService } = await import('../services/VercelDomainManagerService.js');
    
    // Initialize service
    const vercelService = new VercelDomainManagerService(
      process.env.VERCEL_TOKEN || '',
      process.env.VERCEL_PROJECT_ID || ''
    );

    // Test domain status
    console.log('[Debug] Testing domain status for:', domain);
    const status = await vercelService.getDomainStatus(domain);

    // Test domain config
    let config = null;
    let configError = null;
    try {
      console.log('[Debug] Testing domain config for:', domain);
      config = await vercelService.getDomainConfig(domain);
    } catch (error) {
      configError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Debug] Domain config error:', error);
    }

    return res.json({
      success: true,
      data: {
        domain,
        vercel_config: vercelConfig,
        status,
        config,
        configError,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Debug] DNS status test error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test DNS status',
      vercel_config: {
        token: process.env.VERCEL_TOKEN ? '***HIDDEN***' : undefined,
        projectId: process.env.VERCEL_PROJECT_ID,
        hasToken: !!process.env.VERCEL_TOKEN,
        hasProjectId: !!process.env.VERCEL_PROJECT_ID
      }
    });
  }
});

// GET /api/debug/env-check
router.get('/env-check', async (_req, res) => {
  return res.json({
    success: true,
    env: {
      VERCEL_TOKEN: process.env.VERCEL_TOKEN ? '***HIDDEN***' : 'NOT SET',
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID || 'NOT SET',
      VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID || 'NOT SET',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET'
    }
  });
});

// GET /api/debug/logs – return recent internal logs (Vercel etc.)
router.get('/logs', async (_req, res) => {
  const { getLogs } = await import('../utils/LogStore.js');
  return res.json({ success: true, logs: getLogs() });
});

// GET /api/debug/req/:reqId  → returns recent in-memory logs filtered by reqId
router.get('/req/:reqId', async (req, res) => {
  try {
    const { reqId } = req.params as { reqId: string };
    const { getLogs } = await import('../utils/LogStore.js');
    const all = getLogs?.() || [];
    const logs = (all || []).filter((l: any) => {
      const m = l?.meta || l;
      return m?.reqId === reqId;
    });
    return res.json({ reqId, count: logs.length, logs });
  } catch (e: any) {
    return res.status(500).json({ error: 'DEBUG_REQ_FETCH_FAILED', message: String(e?.message || e) });
  }
});

export default router; 

// =============================================================================
// Board Studio Troubleshooting Snapshot
// =============================================================================
// GET /api/debug/board-studio-snapshot
// Returns high-signal data for diagnosing Board Studio loading issues
// Small index to list debug endpoints and usage
router.get('/', async (_req, res) => {
  try {
    const [now, domains, keepers, boards] = await Promise.all([
      prisma.$queryRawUnsafe<{ now: string }[]>(`SELECT NOW()::timestamptz AS now;`),
      prisma.$queryRawUnsafe<{ c: number }[]>(`SELECT COUNT(*)::int AS c FROM "Domain";`).catch(() => [{ c: 0 }]),
      prisma.$queryRawUnsafe<{ c: number }[]>(`SELECT COUNT(*)::int AS c FROM "Keeper";`).catch(() => [{ c: 0 }]),
      prisma.$queryRawUnsafe<{ c: number }[]>(`SELECT COUNT(*)::int AS c FROM "Board";`).catch(() => [{ c: 0 }]),
    ]);
    res.json({
      ok: true,
      now: now?.[0]?.now ?? null,
      counts: { domains: domains?.[0]?.c ?? 0, keepers: keepers?.[0]?.c ?? 0, boards: boards?.[0]?.c ?? 0 },
      env: { node: process.version, runtime: 'express' }
    });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message ?? 'debug-failed' });
  }
});

router.get('/board-studio-snapshot', optionalAuthMiddleware as any, async (req, res) => {
  try {
    const { addLog, getLogs } = await import('../utils/LogStore.js');
    addLog('board-studio-snapshot-enter', { path: req.path, user: (req as any).user?.id });

    // Capture Keeper API status
    let keepers: any = null;
    let keepersError: any = null;
    try {
      const userId = (req as any).user?.id || (req.query.userId as string | undefined);
      if (userId) {
        keepers = await prisma.keeper.findMany({ where: { ownerId: userId }, select: { id: true, title: true, domainId: true, updatedAt: true } });
      }
    } catch (e: any) {
      keepersError = e?.message || 'unknown';
    }

    // Capture most recent logs touching auth/perm probes
    const recent = getLogs().slice(-200).filter((l: any) => ['auth-probe-enter','perm-probe-enter'].includes(l.tag));

    // Capture theme endpoint smoke check (if environment variable set)
    const themeId = process.env.DEBUG_THEME_ID as string | undefined;
    let themeCheck: any = null;
    if (themeId) {
      try {
        const theme = await prisma.themes.findUnique({ where: { id: themeId } as any });
        themeCheck = { exists: !!theme, hasLight: (theme as any)?.light != null, hasDark: (theme as any)?.dark != null };
      } catch (e: any) {
        themeCheck = { error: e?.message || 'unknown' };
      }
    }

    // Backend route map
    const routes = [
      { path: '/api/keeper/keepers?userId=…', requiresAuth: true },
      { path: '/api/board-data', requiresAuth: true },
      { path: '/api/themes/:id', requiresAuth: false },
    ];

    return res.json({
      success: true,
      data: {
        serverTime: new Date().toISOString(),
        user: (req as any).user || null,
        userIdParam: req.query.userId || null,
        routes,
        keepers: Array.isArray(keepers) ? { count: keepers.length, sample: keepers.slice(0, 3) } : null,
        keepersError,
        themeCheck,
        recentLogs: recent,
        env: {
          NODE_ENV: process.env.NODE_ENV,
          RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
          VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ? 'set' : 'unset',
        },
        nextSteps: !((req as any).user || req.query.userId)
          ? 'Pass Authorization: Bearer <token> header or ?userId=<uuid> to include keeper data.'
          : undefined,
      },
    });
  } catch (error) {
    console.error('board-studio-snapshot error:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'unknown' });
  }
});

// =============================================================================
// One-shot Aggregate Debug
// =============================================================================
// GET /api/debug/all
// Combines: snapshot + logs + env + railway status (single call)
router.get('/all', optionalAuthMiddleware as any, async (req, res) => {
  try {
    const { getLogs, addLog } = await import('../utils/LogStore.js');
    addLog('debug-all-enter', { path: req.path, user: (req as any).user?.id });

    // Base info
    const now = new Date().toISOString();
    const env = {
      NODE_ENV: process.env.NODE_ENV,
      RAILWAY_PUBLIC_DOMAIN: process.env.RAILWAY_PUBLIC_DOMAIN,
      RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT,
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ? 'set' : 'unset',
      PORT: process.env.PORT,
    };

    // Railway status (inline, no external API calls)
    const railway = {
      service: process.env.RAILWAY_SERVICE_NAME || 'unknown',
      environment: process.env.RAILWAY_ENVIRONMENT || 'unknown',
      deployment: process.env.RAILWAY_DEPLOYMENT_ID || 'unknown',
      public_domain: process.env.RAILWAY_PUBLIC_DOMAIN || 'not_set',
      private_domain: process.env.RAILWAY_PRIVATE_DOMAIN || 'not_set',
    };

    // Keeper snapshot (re-using logic from snapshot endpoint)
    let keepers: any = null;
    let keepersError: any = null;
    const userId = (req as any).user?.id || (req.query.userId as string | undefined);
    try {
      if (userId) {
        keepers = await prisma.keeper.findMany({ where: { ownerId: userId }, select: { id: true, title: true, domainId: true, updatedAt: true } });
      }
    } catch (e: any) {
      keepersError = e?.message || 'unknown';
    }

    // Theme smoke check if configured
    const themeId = process.env.DEBUG_THEME_ID as string | undefined;
    let themeCheck: any = null;
    if (themeId) {
      try {
        const theme = await prisma.themes.findUnique({ where: { id: themeId } as any });
        themeCheck = { exists: !!theme, hasLight: (theme as any)?.light != null, hasDark: (theme as any)?.dark != null };
      } catch (e: any) {
        themeCheck = { error: e?.message || 'unknown' };
      }
    }

    // Recent logs (trim)
    const recentLogs = getLogs().slice(-300);

    // Route map
    const routes = [
      { path: '/api/keeper/keepers?userId=…', requiresAuth: true },
      { path: '/api/board-data', requiresAuth: true },
      { path: '/api/themes/:id', requiresAuth: false },
      { path: '/api/debug/*', requiresAuth: false },
    ];

    return res.json({
      success: true,
      data: {
        serverTime: now,
        user: (req as any).user || null,
        userIdParam: req.query.userId || null,
        env,
        railway,
        keepers: Array.isArray(keepers) ? { count: keepers.length, sample: keepers.slice(0, 3) } : null,
        keepersError,
        themeCheck,
        routes,
        recentLogs,
        nextSteps: !((req as any).user || req.query.userId)
          ? 'Pass Authorization: Bearer <token> header or ?userId=<uuid> to include keeper data.'
          : undefined,
      },
    });
  } catch (error) {
    console.error('debug-all error:', error);
    return res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'unknown' });
  }
});