import { describe, expect, it } from 'vitest';
import {
  buildMcpToolSystemPrompt,
  getMcpToolsForCapabilities,
  hasSuccessfulMcpResults,
} from './mcpAgentBridge.js';

describe('mcpAgentBridge', () => {
  it('filters tools by infra read capabilities', () => {
    const tools = getMcpToolsForCapabilities(['infra.railway.read', 'infra.vercel.read']);
    const names = tools.map((tool) => tool.name);
    expect(names).toContain('railway_get_deployments');
    expect(names).toContain('vercel_get_deployments');
    expect(names).not.toContain('railway_trigger_redeploy');
  });

  it('includes GitHub and integration tools when capabilities allow', () => {
    const tools = getMcpToolsForCapabilities([
      'github.repo.read',
      'integrations.list',
      'nango.status.read',
      'resend.status.read',
    ]);
    const names = tools.map((tool) => tool.name);
    expect(names).toContain('github.repo.read');
    expect(names).toContain('integrations_list');
    expect(names).toContain('nango_get_status');
    expect(names).toContain('resend_get_status');
  });

  it('builds MCP system prompt with mcp.call instructions', () => {
    const tools = getMcpToolsForCapabilities(['infra.railway.read']);
    const prompt = buildMcpToolSystemPrompt(tools);
    expect(prompt).toContain('mcp.call');
    expect(prompt).toContain('railway_get_deployments');
    expect(prompt).toContain('live and callable');
  });

  it('detects successful MCP action results', () => {
    expect(
      hasSuccessfulMcpResults([
        { type: 'mcp.call', status: 'success', message: 'ok' },
      ]),
    ).toBe(true);
    expect(
      hasSuccessfulMcpResults([
        { type: 'mcp.call', status: 'error', message: 'fail' },
      ]),
    ).toBe(false);
  });
});
