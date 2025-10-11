// src/mcp/mcp.test.ts
// Unit tests for MCP (Model Context Protocol) server

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Express } from 'express';
import mcpRouter from './index.js';

describe('MCP Server', () => {
  let app: Express;
  const VALID_KEY = 'test-mcp-key-12345';
  const INVALID_KEY = 'wrong-key';

  beforeEach(() => {
    // Set test API key
    process.env.OPAI_AGENT_MCP_KEY = VALID_KEY;
    
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/mcp', mcpRouter);
  });

  describe('CORS Headers', () => {
    it('includes CORS headers on GET requests', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toBeDefined();
    });

    it('handles OPTIONS preflight requests', async () => {
      const res = await request(app)
        .options('/api/mcp/schema')
        .set('Origin', 'https://platform.openai.com');
      
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('*');
      expect(res.headers['access-control-allow-methods']).toContain('GET');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
      expect(res.headers['access-control-allow-headers']).toContain('Authorization');
      expect(res.headers['access-control-allow-headers']).toContain('x-api-key');
    });

    it('includes Content-Type header on all responses', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.headers['content-type']).toContain('charset=utf-8');
    });
  });

  describe('Authentication', () => {
    it('401 when Authorization header missing', async () => {
      const res = await request(app).get('/api/mcp/');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toBe('Unauthorized');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.ok).toBe(false);
    });

    it('401 when x-api-key header missing', async () => {
      const res = await request(app).get('/api/mcp/schema');
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body.ok).toBe(false);
    });

    it('401 when API key is wrong', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `Bearer ${INVALID_KEY}`);
      
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Unauthorized');
    });

    it('401 when x-api-key is wrong', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('x-api-key', INVALID_KEY);
      
      expect(res.status).toBe(401);
    });

    it('200 when Authorization Bearer is correct', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('200 when x-api-key is correct', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('x-api-key', VALID_KEY);
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('handles Bearer with different case', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `BEARER ${VALID_KEY}`);
      
      expect(res.status).toBe(200);
    });

    it('401 when env var not set', async () => {
      delete process.env.OPAI_AGENT_MCP_KEY;
      
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      expect(res.status).toBe(401);
    });
  });

  describe('Health Check (GET /)', () => {
    it('returns service info', async () => {
      const res = await request(app)
        .get('/api/mcp/')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        ok: true,
        service: 'keeper-mcp',
        version: '0.0.1'
      });
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('Schema Endpoint (GET /schema)', () => {
    it('returns tool list with schemas', async () => {
      const res = await request(app)
        .get('/api/mcp/schema')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('service', 'keeper-mcp');
      expect(res.body).toHaveProperty('version', '0.0.1');
      expect(res.body).toHaveProperty('tools');
      expect(res.body).toHaveProperty('timestamp');
      expect(Array.isArray(res.body.tools)).toBe(true);
    });

    it('includes expected tools', async () => {
      const res = await request(app)
        .get('/api/mcp/schema')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      const toolNames = res.body.tools.map((t: any) => t.name);
      expect(toolNames).toContain('gk_recent_moments');
      expect(toolNames).toContain('pool_create_quote');
    });

    it('tools have required schema properties', async () => {
      const res = await request(app)
        .get('/api/mcp/schema')
        .set('Authorization', `Bearer ${VALID_KEY}`);
      
      res.body.tools.forEach((tool: any) => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('parameters');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(typeof tool.parameters).toBe('object');
      });
    });
  });

  describe('Tool Call Endpoint (POST /call)', () => {
    it('400 when tool name missing', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toBe('Missing tool name');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('400 when tool not found', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({ name: 'nonexistent_tool' });
      
      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error).toContain('Unknown tool');
      expect(res.body).toHaveProperty('timestamp');
    });

    it('calls gk_recent_moments successfully', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({ 
          name: 'gk_recent_moments',
          args: { limit: 3 }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body).toHaveProperty('result');
      expect(res.body.result).toHaveProperty('moments');
      expect(Array.isArray(res.body.result.moments)).toBe(true);
      expect(res.body.result.moments).toHaveLength(3);
    });

    it('calls pool_create_quote successfully', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({ 
          name: 'pool_create_quote',
          args: { 
            projectId: 'proj_123',
            craneOverHouse: true,
            includesHeatPump: false
          }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.result).toHaveProperty('quoteId');
      expect(res.body.result).toHaveProperty('appliedRules');
      expect(res.body.result.appliedRules.craneOverHouse).toBe(true);
      expect(res.body.result.appliedRules.includesHeatPump).toBe(false);
    });

    it('extracts domainId from x-domain-id header', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .set('x-domain-id', 'domain-123')
        .send({ 
          name: 'gk_recent_moments',
          args: { limit: 1 }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.result.moments[0]).toHaveProperty('domain_id', 'domain-123');
    });

    it('handles missing args gracefully', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({ name: 'gk_recent_moments' });
      
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      // Should use default limit
      expect(res.body.result.moments).toHaveLength(5);
    });

    it('includes timestamp in response', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({ name: 'gk_recent_moments' });
      
      expect(res.body).toHaveProperty('timestamp');
      expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('Domain Scoping', () => {
    it('passes domainId to tool handler', async () => {
      const testDomain = 'test-domain-456';
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .set('x-domain-id', testDomain)
        .send({ 
          name: 'pool_create_quote',
          args: { projectId: 'proj_789' }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.result.domainId).toBe(testDomain);
    });

    it('allows null domainId when header not provided', async () => {
      const res = await request(app)
        .post('/api/mcp/call')
        .set('Authorization', `Bearer ${VALID_KEY}`)
        .send({ 
          name: 'pool_create_quote',
          args: { projectId: 'proj_000' }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.result.domainId).toBeNull();
    });
  });
});

