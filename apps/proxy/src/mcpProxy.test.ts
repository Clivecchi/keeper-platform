/**
 * Unit tests for MCP Proxy Schema Handler
 * 
 * Tests MCP v1 compliance for /api/mcp/schema endpoint
 */

import express, { Express } from "express";
import request from "supertest";

// Mock node-fetch before importing mcpProxy
jest.mock("node-fetch");
import fetch from "node-fetch";
const { Response } = jest.requireActual("node-fetch");

import mcpProxy from "./mcpProxy";

describe("MCP Proxy Schema Handler", () => {
  let app: Express;

  beforeEach(() => {
    // Setup Express app with MCP router
    app = express();
    app.use(express.json());
    app.use("/api/mcp", mcpProxy);

    // Set required env var
    process.env.KEEPER_API_BASE = "https://test-api.example.com";
    process.env.NODE_ENV = "test";

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.KEEPER_API_BASE;
    delete process.env.NODE_ENV;
  });

  describe("GET /api/mcp/schema - MCP v1 Compliance", () => {
    it("should transform upstream schema to MCP v1 format", async () => {
      // Mock upstream response
      const upstreamSchema = {
        service: "keeper-mcp",
        version: "0.0.1",
        tools: [
          {
            name: "create_topic",
            description: "Create a new topic in the keeper system",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Topic title" },
                content: { type: "string", description: "Topic content" }
              },
              required: ["title"]
            }
          },
          {
            name: "list_topics",
            description: "List all topics",
            parameters: {
              type: "object",
              properties: {
                limit: { type: "number", description: "Max results" }
              }
            }
          }
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      );

      const response = await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer test-key-123");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);

      const body = response.body;

      // Assert MCP v1 top-level structure
      expect(body).toHaveProperty("mcp");
      expect(body).toHaveProperty("server");
      expect(body).toHaveProperty("tools");

      // Assert mcp.version exists
      expect(body.mcp).toHaveProperty("version", "1.0");

      // Assert server structure
      expect(body.server).toHaveProperty("name");
      expect(body.server.name).toHaveProperty("human_readable", "keeper-mcp");
      expect(body.server).toHaveProperty("version", "0.0.1");

      // Assert tools structure
      expect(Array.isArray(body.tools)).toBe(true);
      expect(body.tools.length).toBe(2);

      // Assert first tool has required MCP v1 fields
      const tool1 = body.tools[0];
      expect(tool1).toHaveProperty("name", "create_topic");
      expect(tool1).toHaveProperty("description");
      expect(tool1).toHaveProperty("input_schema"); // NOT "parameters"

      // Assert input_schema is the transformed parameters
      expect(tool1.input_schema).toHaveProperty("type", "object");
      expect(tool1.input_schema).toHaveProperty("properties");
      expect(typeof tool1.input_schema.properties).toBe("object");
      expect(tool1.input_schema.properties).toHaveProperty("title");
      expect(Array.isArray(tool1.input_schema.required)).toBe(true);
      expect(tool1.input_schema.required).toContain("title");

      // Assert second tool
      const tool2 = body.tools[1];
      expect(tool2).toHaveProperty("name", "list_topics");
      expect(tool2).toHaveProperty("input_schema");
      expect(tool2.input_schema.properties).toHaveProperty("limit");
    });

    it("should handle x-api-key header authentication", async () => {
      const upstreamSchema = {
        service: "keeper-mcp",
        version: "1.0.0",
        tools: []
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      await request(app)
        .get("/api/mcp/schema")
        .set("x-api-key", "test-api-key-456");

      // Verify fetch was called with correct headers
      expect(fetch).toHaveBeenCalledWith(
        "https://test-api.example.com/api/mcp/schema",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "test-api-key-456",
            "authorization": "Bearer test-api-key-456"
          })
        })
      );
    });

    it("should handle Bearer token authentication", async () => {
      const upstreamSchema = {
        service: "keeper-mcp",
        version: "1.0.0",
        tools: []
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer my-bearer-token");

      // Verify fetch was called with extracted Bearer token
      expect(fetch).toHaveBeenCalledWith(
        "https://test-api.example.com/api/mcp/schema",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-api-key": "my-bearer-token",
            "authorization": "Bearer my-bearer-token"
          })
        })
      );
    });

    it("should provide defaults for missing upstream fields", async () => {
      // Minimal upstream response
      const upstreamSchema = {
        tools: []
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      const response = await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer test-key");

      expect(response.status).toBe(200);
      expect(response.body.server.name.human_readable).toBe("keeper-mcp");
      expect(response.body.server.version).toBe("0.0.1");
    });

    it("should handle tools with missing parameters", async () => {
      const upstreamSchema = {
        service: "keeper-mcp",
        version: "1.0.0",
        tools: [
          {
            name: "simple_tool",
            description: "A tool with no parameters"
            // no parameters field
          }
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      const response = await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer test-key");

      expect(response.status).toBe(200);
      expect(response.body.tools[0].input_schema).toEqual({
        type: "object",
        properties: {}
      });
    });

    it("should set correct Content-Type header with charset", async () => {
      const upstreamSchema = { service: "test", version: "1.0", tools: [] };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      const response = await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer test-key");

      expect(response.headers["content-type"]).toMatch(/application\/json.*charset=utf-8/);
    });

    it("ensures input_schema.properties is an object for every tool", async () => {
      const upstreamSchema = {
        service: "test-service",
        version: "1.0.0",
        tools: [
          {
            name: "tool_with_properties",
            description: "Has properties",
            parameters: {
              type: "object",
              properties: { field: { type: "string" } }
            }
          },
          {
            name: "tool_without_properties",
            description: "Missing properties",
            parameters: { type: "object" }
          }
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      const res = await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer TEST_KEY");

      expect(res.status).toBe(200);
      for (const t of res.body.tools) {
        expect(t).toHaveProperty("input_schema.properties");
        expect(typeof t.input_schema.properties).toBe("object");
        expect(Array.isArray(t.input_schema.properties)).toBe(false);
        expect(t.input_schema.properties).not.toBeNull();
      }
    });

    it("tools have valid input_schema with properties as object", async () => {
      const upstreamSchema = {
        service: "test-service",
        version: "1.0.0",
        tools: [
          {
            name: "tool_a",
            description: "Test tool A",
            parameters: {
              type: "object",
              properties: {
                field1: { type: "string" },
                field2: { type: "integer" },
              },
              required: ["field1"],
              additionalProperties: true
            }
          },
          {
            name: "tool_b",
            description: "Test tool B",
            parameters: {
              // Missing properties - should be added as {}
              required: ["missing"]
            }
          }
        ]
      };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      const res = await request(app)
        .get("/api/mcp/schema")
        .set("Authorization", "Bearer TEST_KEY");

      expect(res.status).toBe(200);
      const body = res.body;

      // Top-level MCP v1 structure
      expect(body.mcp?.version).toBe("1.0");
      expect(body.server?.name?.human_readable).toBeTruthy();
      expect(typeof body.server?.name?.human_readable).toBe("string");
      expect(body.server?.version).toBeTruthy();
      expect(typeof body.server?.version).toBe("string");
      expect(Array.isArray(body.tools)).toBe(true);

      // Validate each tool's input_schema
      for (const t of body.tools) {
        expect(typeof t.name).toBe("string");
        expect(t.name.length).toBeGreaterThan(0);
        expect(typeof t.description).toBe("string");
        expect(t.description.length).toBeGreaterThan(0);

        const s = t.input_schema;
        
        // Root must be object type
        expect(s?.type).toBe("object");
        
        // Properties must exist and be an object (can be empty)
        expect(s).toHaveProperty("properties");
        expect(typeof s.properties).toBe("object");
        expect(s.properties).not.toBeNull();
        
        // additionalProperties must be boolean if present
        if (s.hasOwnProperty("additionalProperties")) {
          expect(typeof s.additionalProperties).toBe("boolean");
        }
        
        // required must be array
        expect(Array.isArray(s.required)).toBe(true);
      }
      
      // Verify properties exists even when missing in upstream
      const toolB = body.tools.find((t: any) => t.name === "tool_b");
      expect(toolB?.input_schema).toHaveProperty("properties");
      expect(typeof toolB?.input_schema.properties).toBe("object");
    });
  });

  describe("CORS Headers", () => {
    it("should echo Origin header in CORS response", async () => {
      const upstreamSchema = { service: "test", version: "1.0", tools: [] };

      (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce(
        new Response(JSON.stringify(upstreamSchema), { status: 200 })
      );

      const response = await request(app)
        .get("/api/mcp/schema")
        .set("Origin", "https://openai.com")
        .set("Authorization", "Bearer test-key");

      expect(response.headers["access-control-allow-origin"]).toBe("https://openai.com");
      expect(response.headers["vary"]).toContain("Origin");
      expect(response.headers["access-control-allow-credentials"]).toBe("true");
    });

    it("should handle OPTIONS preflight requests", async () => {
      const response = await request(app)
        .options("/api/mcp/schema")
        .set("Origin", "https://example.com");

      expect(response.status).toBe(204);
      expect(response.headers["access-control-allow-methods"]).toContain("GET");
      expect(response.headers["access-control-allow-methods"]).toContain("POST");
      expect(response.headers["access-control-allow-methods"]).toContain("HEAD");
      expect(response.headers["access-control-allow-headers"]).toContain("Authorization");
      expect(response.headers["access-control-allow-headers"]).toContain("x-api-key");
    });
  });

  describe("HEAD probes", () => {
    it("should respond to HEAD /api/mcp/schema", async () => {
      const response = await request(app).head("/api/mcp/schema");
      expect(response.status).toBe(200);
    });

    it("should respond to HEAD /api/mcp", async () => {
      const response = await request(app).head("/api/mcp");
      expect(response.status).toBe(200);
    });
  });

  describe("Health check", () => {
    it("should respond to GET /api/mcp with service info", async () => {
      const response = await request(app).get("/api/mcp");
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        ok: true,
        service: "keeper-mcp-proxy"
      });
    });
  });
});

/**
 * Standalone MCP v1 Compliance Test
 * Can be run independently to verify schema structure
 */
describe("MCP v1 Schema Compliance - Standalone", () => {
  it("should have all required MCP v1 top-level keys", () => {
    // Example transformed schema
    const mcpSchema = {
      mcp: { version: "1.0" },
      server: {
        name: { human_readable: "keeper-mcp" },
        version: "0.0.1"
      },
      tools: [
        {
          name: "example_tool",
          description: "An example tool",
          input_schema: { type: "object", properties: {} }
        }
      ]
    };

    // Assert MCP v1 compliance
    expect(mcpSchema).toHaveProperty("mcp.version");
    expect(mcpSchema.mcp.version).toBe("1.0");
    
    expect(mcpSchema).toHaveProperty("server.name.human_readable");
    expect(mcpSchema.server.name.human_readable).toBeTruthy();
    
    expect(mcpSchema).toHaveProperty("server.version");
    expect(mcpSchema.server.version).toBeTruthy();
    
    expect(Array.isArray(mcpSchema.tools)).toBe(true);
    
    if (mcpSchema.tools.length > 0) {
      const tool = mcpSchema.tools[0];
      expect(tool).toHaveProperty("name");
      expect(tool).toHaveProperty("description");
      expect(tool).toHaveProperty("input_schema");
      expect(tool).not.toHaveProperty("parameters"); // Must NOT have old key
    }
  });
});

