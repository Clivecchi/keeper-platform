// src/mcp/tools.ts
// Tool registry and handlers for MCP server
// Provides safe, domain-scoped tools for OpenAI Agent

export type Tool = {
  name: string;
  description: string;
  parameters: any; // JSON Schema
  handler: (args: any, ctx: { domainId: string | null }) => Promise<any>;
};

/**
 * Tool Registry
 * 
 * Register safe, auditable tools that the OpenAI Agent can call.
 * All tools receive domain context for proper scoping.
 */
const tools: Tool[] = [
  {
    name: 'gk_recent_moments',
    description: 'List recent GenerationKeeper moments in the current domain.',
    parameters: {
      type: 'object',
      properties: {
        limit: { 
          type: 'number', 
          minimum: 1, 
          maximum: 20, 
          default: 5,
          description: 'Number of moments to return (1-20)'
        }
      }
    },
    async handler(args, ctx) {
      const limit = Math.min(Math.max(args?.limit ?? 5, 1), 20);
      
      // TODO: Replace with real DB call filtered by ctx.domainId
      // Example: await prisma.moments.findMany({ 
      //   where: { domainId: ctx.domainId },
      //   take: limit,
      //   orderBy: { createdAt: 'desc' }
      // })
      
      return { 
        moments: Array.from({ length: limit }, (_, i) => ({ 
          id: `mom_${i + 1}`, 
          title: `Mock Moment ${i + 1}`,
          domain_id: ctx.domainId 
        })) 
      };
    }
  },
  {
    name: 'pool_create_quote',
    description: 'Create a PoolKeeper quote with business rules.',
    parameters: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: { 
          type: 'string',
          description: 'ID of the project to quote'
        },
        craneOverHouse: { 
          type: 'boolean', 
          default: false,
          description: 'Whether crane must go over house'
        },
        includesHeatPump: { 
          type: 'boolean', 
          default: false,
          description: 'Whether quote includes heat pump installation'
        }
      }
    },
    async handler(args, ctx) {
      // TODO: Call real service; enforce ctx.domainId scoping
      // Example: await poolService.createQuote({
      //   projectId: args.projectId,
      //   domainId: ctx.domainId,
      //   craneOverHouse: args.craneOverHouse,
      //   includesHeatPump: args.includesHeatPump
      // })
      
      return { 
        quoteId: `q_${Date.now()}`,
        projectId: args.projectId,
        domainId: ctx.domainId,
        appliedRules: { 
          craneOverHouse: !!args.craneOverHouse, 
          includesHeatPump: !!args.includesHeatPump 
        },
        timestamp: new Date().toISOString()
      };
    }
  }
];

/**
 * Get MCP Schema
 * 
 * Returns the tool list with JSON schemas for the OpenAI Agent.
 */
export function getSchema() {
  return {
    service: 'keeper-mcp',
    version: '0.0.1',
    tools: tools.map(t => ({ 
      name: t.name, 
      description: t.description, 
      parameters: t.parameters 
    }))
  };
}

/**
 * Call Tool
 * 
 * Invokes a registered tool by name with given arguments.
 * 
 * @param name - Tool name
 * @param args - Tool arguments
 * @param ctx - Execution context with domainId
 * @returns Tool execution result
 * @throws Error if tool not found
 */
export async function callTool(
  name: string, 
  args: any, 
  ctx: { domainId: string | null }
): Promise<any> {
  const tool = tools.find(t => t.name === name);
  
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  
  return tool.handler(args, ctx);
}

/**
 * Get all available tool names
 */
export function getToolNames(): string[] {
  return tools.map(t => t.name);
}

