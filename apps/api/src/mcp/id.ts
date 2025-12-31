// src/mcp/id.ts
// Request ID generator for MCP endpoints
// Generates short, unique IDs for request correlation

/**
 * Generate Request ID
 * 
 * Creates a short, URL-safe random identifier for request tracking.
 * Format: 8 alphanumeric characters (e.g., "a7f3k9m2")
 * 
 * @returns Random request ID
 */
export function rid(): string {
  return Math.random().toString(36).slice(2, 10);
}

