import { describe, expect, it } from 'vitest';
import { CLOUD_MCP_CEILING } from '@keeper/shared';
import {
  ALL_INFRA_CAPABILITIES,
  GITHUB_MCP_TOOL_CAPABILITIES,
  GLOSS_MCP_TOOL_CAPABILITIES,
  INTEGRATION_MCP_TOOL_CAPABILITIES,
  LIBRARY_MCP_TOOL_CAPABILITIES,
} from './infraCapabilities.js';

describe('CLOUD_MCP_CEILING', () => {
  it('covers every API infra and MCP tool capability string', () => {
    const declared = [
      ...ALL_INFRA_CAPABILITIES,
      ...GITHUB_MCP_TOOL_CAPABILITIES,
      ...INTEGRATION_MCP_TOOL_CAPABILITIES,
      ...LIBRARY_MCP_TOOL_CAPABILITIES,
      ...GLOSS_MCP_TOOL_CAPABILITIES,
    ];
    for (const cap of declared) {
      expect(CLOUD_MCP_CEILING).toContain(cap);
    }
  });
});
