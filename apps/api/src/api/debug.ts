import express, { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import { logger } from '@keeper/shared';
import { prisma } from '@keeper/database';
import { randomUUID } from 'crypto';
import { ModelProviderService } from '../services/ModelProviderService.js';
import type { ModelProvider } from '@keeper/database/types';

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
    let databaseTest: any = null;
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
    const fixes: any = {
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
        fixes.actions.push({
          action: 'created_kip_agent',
          success: true,
          agent_id: newKipAgent.id,
          message: 'Created missing Kip Lead agent'
        });
      } catch (error) {
        fixes.errors.push({
          action: 'create_kip_agent',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      fixes.actions.push({
        action: 'kip_agent_exists',
        success: true,
        agent_id: kipAgent.id,
        message: 'Kip agent already exists'
      });
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
        fixes.actions.push({
          action: 'created_ceox_agent',
          success: true,
          agent_id: newCeoxAgent.id,
          message: 'Created missing CeoX Lead agent'
        });
      } catch (error) {
        fixes.errors.push({
          action: 'create_ceox_agent',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      fixes.actions.push({
        action: 'ceox_agent_exists',
        success: true,
        agent_id: ceoxAgent.id,
        message: 'CeoX agent already exists'
      });
    }

    // Activate platform keys
    try {
      const updatedKeys = await prisma.kip_platform_keys.updateMany({
        where: { is_active: false },
        data: { is_active: true, updated_at: new Date() }
      });
      
      if (updatedKeys.count > 0) {
        fixes.actions.push({
          action: 'activated_platform_keys',
          success: true,
          count: updatedKeys.count,
          message: `Activated ${updatedKeys.count} platform keys`
        });
      } else {
        fixes.actions.push({
          action: 'platform_keys_already_active',
          success: true,
          message: 'Platform keys were already active'
        });
      }
    } catch (error) {
      fixes.errors.push({
        action: 'activate_platform_keys',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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

export default router; 