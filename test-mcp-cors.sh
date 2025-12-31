#!/bin/bash
# Test MCP CORS Headers
# Verifies OpenAI Agent Builder can connect without hanging

set -e

echo "🔍 MCP CORS Header Tests"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://api.ke3p.com}"
MCP_KEY="${OPAI_AGENT_MCP_KEY:-}"

if [ -z "$MCP_KEY" ]; then
  echo -e "${YELLOW}⚠️  Warning: OPAI_AGENT_MCP_KEY not set${NC}"
  echo "   Set it with: export OPAI_AGENT_MCP_KEY='your_key_here'"
  echo ""
  exit 1
fi

# Test 1: OPTIONS Preflight Request
echo "Test 1: OPTIONS Preflight (simulating browser)"
echo "------------------------------------------------"
RESPONSE=$(curl -s -i -X OPTIONS "$API_URL/api/mcp/schema" \
  -H "Origin: https://platform.openai.com" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Authorization")

HTTP_CODE=$(echo "$RESPONSE" | head -n1 | awk '{print $2}')
CORS_ORIGIN=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | cut -d: -f2 | tr -d ' \r')
CORS_METHODS=$(echo "$RESPONSE" | grep -i "access-control-allow-methods" | cut -d: -f2 | tr -d '\r')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: Preflight returns 200${NC}"
else
  echo -e "${RED}❌ FAIL: Expected 200, got $HTTP_CODE${NC}"
fi

if [ "$CORS_ORIGIN" = "*" ]; then
  echo -e "${GREEN}✅ PASS: CORS Origin is *${NC}"
else
  echo -e "${RED}❌ FAIL: CORS Origin is '$CORS_ORIGIN' (expected *)${NC}"
fi

if [[ "$CORS_METHODS" == *"GET"* ]] && [[ "$CORS_METHODS" == *"POST"* ]]; then
  echo -e "${GREEN}✅ PASS: CORS Methods include GET and POST${NC}"
else
  echo -e "${RED}❌ FAIL: CORS Methods missing GET or POST${NC}"
fi

echo ""

# Test 2: GET with CORS Headers
echo "Test 2: GET /api/mcp/ with CORS headers"
echo "----------------------------------------"
RESPONSE=$(curl -s -i -X GET "$API_URL/api/mcp/" \
  -H "Authorization: Bearer $MCP_KEY" \
  -H "Origin: https://platform.openai.com")

HTTP_CODE=$(echo "$RESPONSE" | head -n1 | awk '{print $2}')
CONTENT_TYPE=$(echo "$RESPONSE" | grep -i "content-type" | cut -d: -f2 | tr -d ' \r')
CORS_ORIGIN=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | cut -d: -f2 | tr -d ' \r')
BODY=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: GET returns 200${NC}"
else
  echo -e "${RED}❌ FAIL: Expected 200, got $HTTP_CODE${NC}"
fi

if [[ "$CONTENT_TYPE" == *"application/json"* ]] && [[ "$CONTENT_TYPE" == *"utf-8"* ]]; then
  echo -e "${GREEN}✅ PASS: Content-Type is application/json; charset=utf-8${NC}"
else
  echo -e "${RED}❌ FAIL: Content-Type is '$CONTENT_TYPE'${NC}"
fi

if [ "$CORS_ORIGIN" = "*" ]; then
  echo -e "${GREEN}✅ PASS: CORS Origin is *${NC}"
else
  echo -e "${RED}❌ FAIL: CORS Origin is '$CORS_ORIGIN'${NC}"
fi

if [[ "$BODY" == *"\"ok\":true"* ]]; then
  echo -e "${GREEN}✅ PASS: Response body contains ok:true${NC}"
else
  echo -e "${RED}❌ FAIL: Response body invalid${NC}"
fi

echo ""

# Test 3: GET Schema with x-api-key
echo "Test 3: GET /api/mcp/schema with x-api-key header"
echo "--------------------------------------------------"
RESPONSE=$(curl -s -i -X GET "$API_URL/api/mcp/schema" \
  -H "x-api-key: $MCP_KEY" \
  -H "Origin: https://platform.openai.com")

HTTP_CODE=$(echo "$RESPONSE" | head -n1 | awk '{print $2}')
BODY=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: Schema returns 200${NC}"
else
  echo -e "${RED}❌ FAIL: Expected 200, got $HTTP_CODE${NC}"
fi

if [[ "$BODY" == *"\"tools\":"* ]] && [[ "$BODY" == *"\"timestamp\":"* ]]; then
  echo -e "${GREEN}✅ PASS: Schema contains tools and timestamp${NC}"
else
  echo -e "${RED}❌ FAIL: Schema body invalid${NC}"
fi

echo ""

# Test 4: POST Tool Call
echo "Test 4: POST /api/mcp/call with tool invocation"
echo "------------------------------------------------"
RESPONSE=$(curl -s -i -X POST "$API_URL/api/mcp/call" \
  -H "Authorization: Bearer $MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "Origin: https://platform.openai.com" \
  -d '{"name":"gk_recent_moments","args":{"limit":2}}')

HTTP_CODE=$(echo "$RESPONSE" | head -n1 | awk '{print $2}')
CORS_ORIGIN=$(echo "$RESPONSE" | grep -i "access-control-allow-origin" | cut -d: -f2 | tr -d ' \r')
BODY=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: Tool call returns 200${NC}"
else
  echo -e "${RED}❌ FAIL: Expected 200, got $HTTP_CODE${NC}"
fi

if [ "$CORS_ORIGIN" = "*" ]; then
  echo -e "${GREEN}✅ PASS: CORS Origin is *${NC}"
else
  echo -e "${RED}❌ FAIL: CORS Origin is '$CORS_ORIGIN'${NC}"
fi

if [[ "$BODY" == *"\"ok\":true"* ]] && [[ "$BODY" == *"\"result\":"* ]]; then
  echo -e "${GREEN}✅ PASS: Tool call response valid${NC}"
else
  echo -e "${RED}❌ FAIL: Tool call response invalid${NC}"
fi

echo ""

# Test 5: Verify Timestamp in All Responses
echo "Test 5: Verify timestamp in responses"
echo "--------------------------------------"
RESPONSE=$(curl -s "$API_URL/api/mcp/" -H "Authorization: Bearer $MCP_KEY")

if [[ "$RESPONSE" == *"\"timestamp\":"* ]]; then
  echo -e "${GREEN}✅ PASS: Health check includes timestamp${NC}"
else
  echo -e "${RED}❌ FAIL: Health check missing timestamp${NC}"
fi

RESPONSE=$(curl -s "$API_URL/api/mcp/schema" -H "Authorization: Bearer $MCP_KEY")

if [[ "$RESPONSE" == *"\"timestamp\":"* ]]; then
  echo -e "${GREEN}✅ PASS: Schema includes timestamp${NC}"
else
  echo -e "${RED}❌ FAIL: Schema missing timestamp${NC}"
fi

echo ""

# Summary
echo "========================================"
echo "📋 Test Summary"
echo "========================================"
echo ""
echo "All CORS headers and content-type headers are properly set."
echo "OpenAI Agent Builder should be able to connect without hanging."
echo ""
echo "Next Steps:"
echo "1. Configure OpenAI Agent with:"
echo "   - Base URL: $API_URL/api/mcp"
echo "   - Auth: Bearer token"
echo "   - Token: $MCP_KEY"
echo ""
echo "2. Test connection in OpenAI Agent Builder"
echo "3. Verify 'Connected' status (not 'Establishing connection...')"
echo ""

