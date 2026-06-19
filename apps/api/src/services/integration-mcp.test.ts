import { describe, expect, it, afterEach } from 'vitest';
import { IntegrationMcpService } from './IntegrationMcpService.js';
import { ResendService } from './ResendService.js';
import { getMcpToolsForCapabilities } from './mcpAgentBridge.js';
import { INTEGRATION_MCP_TOOL_CAPABILITIES } from '../capabilities/infraCapabilities.js';

describe('IntegrationMcpService @smoke', () => {
  it('returns Nango status shape', () => {
    const status = IntegrationMcpService.getNangoStatus();
    expect(status).toMatchObject({
      configured: expect.any(Boolean),
      githubProviderConfigKey: expect.any(String),
      servicesUsingNango: ['github'],
    });
  });
});

describe('ResendService @smoke', () => {
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.RESEND_API_KEY;
    } else {
      process.env.RESEND_API_KEY = originalKey;
    }
  });

  it('reports missing API key', async () => {
    delete process.env.RESEND_API_KEY;
    const status = await ResendService.getStatus();
    expect(status.configured).toBe(false);
    expect(status.apiKeyPresent).toBe(false);
    expect(status.hint).toContain('RESEND_API_KEY');
  });
});

describe('integration MCP tools in registry', () => {
  it('registers integration tools for Cloud capabilities', () => {
    const tools = getMcpToolsForCapabilities([...INTEGRATION_MCP_TOOL_CAPABILITIES]);
    const names = tools.map((tool) => tool.name);
    expect(names).toContain('integrations_list');
    expect(names).toContain('nango_get_status');
    expect(names).toContain('resend_get_status');
  });
});
