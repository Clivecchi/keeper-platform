#!/bin/bash
# MCP Base URL Fix - Quick Test Script
# Tests that POST /mcp works with JSON-RPC 2.0 format

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="https://api.ke3p.com/mcp"
API_KEY="${OPAI_AGENT_MCP_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo -e "${RED}❌ ERROR: OPAI_AGENT_MCP_KEY environment variable not set${NC}"
  echo "Usage: export OPAI_AGENT_MCP_KEY='your-key-here' && bash test-mcp-base-url.sh"
  exit 1
fi

echo -e "${YELLOW}🧪 Testing MCP Base URL with JSON-RPC 2.0${NC}"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: Health Check (no auth required)
echo -e "${YELLOW}Test 1: Health Check (GET /mcp/health)${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HEALTH_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: Health check returned 200${NC}"
  echo "Response: $HEALTH_BODY"
else
  echo -e "${RED}❌ FAIL: Health check returned $HEALTH_CODE${NC}"
  echo "Response: $HEALTH_BODY"
  exit 1
fi
echo ""

# Test 2: JSON-RPC list_actions
echo -e "${YELLOW}Test 2: JSON-RPC list_actions (POST /mcp)${NC}"
LIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-list",
    "method": "list_actions",
    "params": {}
  }')

LIST_CODE=$(echo "$LIST_RESPONSE" | tail -n1)
LIST_BODY=$(echo "$LIST_RESPONSE" | head -n-1)

if [ "$LIST_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: list_actions returned 200${NC}"
  
  # Check for JSON-RPC envelope
  if echo "$LIST_BODY" | grep -q '"jsonrpc":"2.0"'; then
    echo -e "${GREEN}✅ PASS: Response has JSON-RPC envelope${NC}"
  else
    echo -e "${RED}❌ FAIL: Response missing JSON-RPC envelope${NC}"
    echo "Response: $LIST_BODY"
    exit 1
  fi
  
  # Check for result.actions
  if echo "$LIST_BODY" | grep -q '"result"' && echo "$LIST_BODY" | grep -q '"actions"'; then
    echo -e "${GREEN}✅ PASS: Response has result.actions${NC}"
  else
    echo -e "${RED}❌ FAIL: Response missing result.actions${NC}"
    echo "Response: $LIST_BODY"
    exit 1
  fi
  
  echo "Response: $LIST_BODY"
else
  echo -e "${RED}❌ FAIL: list_actions returned $LIST_CODE${NC}"
  echo "Response: $LIST_BODY"
  
  if [ "$LIST_CODE" = "405" ]; then
    echo -e "${RED}⚠️  405 = Vercel is not forwarding POST /mcp to Railway${NC}"
    echo "Check vercel.json for exact path rewrite: { \"source\": \"/mcp\", \"destination\": \"...\" }"
  elif [ "$LIST_CODE" = "401" ]; then
    echo -e "${RED}⚠️  401 = Authentication failed${NC}"
    echo "Check OPAI_AGENT_MCP_KEY environment variable in Railway"
  fi
  exit 1
fi
echo ""

# Test 3: JSON-RPC call_action
echo -e "${YELLOW}Test 3: JSON-RPC call_action (POST /mcp)${NC}"
CALL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: test-domain" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test-call",
    "method": "call_action",
    "params": {
      "name": "gk_recent_moments",
      "arguments": {
        "limit": 3
      }
    }
  }')

CALL_CODE=$(echo "$CALL_RESPONSE" | tail -n1)
CALL_BODY=$(echo "$CALL_RESPONSE" | head -n-1)

if [ "$CALL_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: call_action returned 200${NC}"
  
  # Check for JSON-RPC envelope
  if echo "$CALL_BODY" | grep -q '"jsonrpc":"2.0"'; then
    echo -e "${GREEN}✅ PASS: Response has JSON-RPC envelope${NC}"
  else
    echo -e "${RED}❌ FAIL: Response missing JSON-RPC envelope${NC}"
    echo "Response: $CALL_BODY"
    exit 1
  fi
  
  # Check for result
  if echo "$CALL_BODY" | grep -q '"result"'; then
    echo -e "${GREEN}✅ PASS: Response has result${NC}"
  else
    echo -e "${RED}❌ FAIL: Response missing result${NC}"
    echo "Response: $CALL_BODY"
    exit 1
  fi
  
  echo "Response: $CALL_BODY"
else
  echo -e "${RED}❌ FAIL: call_action returned $CALL_CODE${NC}"
  echo "Response: $CALL_BODY"
  exit 1
fi
echo ""

# Test 4: REST endpoints still work
echo -e "${YELLOW}Test 4: REST Endpoints (POST /mcp/actions/list)${NC}"
REST_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/actions/list" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json")

REST_CODE=$(echo "$REST_RESPONSE" | tail -n1)
REST_BODY=$(echo "$REST_RESPONSE" | head -n-1)

if [ "$REST_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: REST endpoint returned 200${NC}"
  
  # Check for actions array
  if echo "$REST_BODY" | grep -q '"actions"'; then
    echo -e "${GREEN}✅ PASS: Response has actions array${NC}"
  else
    echo -e "${RED}❌ FAIL: Response missing actions array${NC}"
    echo "Response: $REST_BODY"
    exit 1
  fi
  
  echo "Response: $REST_BODY"
else
  echo -e "${RED}❌ FAIL: REST endpoint returned $REST_CODE${NC}"
  echo "Response: $REST_BODY"
  exit 1
fi
echo ""

# Test 5: Diagnostic endpoint
echo -e "${YELLOW}Test 5: Diagnostic Endpoint (GET /mcp/_diag)${NC}"
DIAG_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/_diag" \
  -H "Authorization: Bearer $API_KEY")

DIAG_CODE=$(echo "$DIAG_RESPONSE" | tail -n1)
DIAG_BODY=$(echo "$DIAG_RESPONSE" | head -n-1)

if [ "$DIAG_CODE" = "200" ]; then
  echo -e "${GREEN}✅ PASS: Diagnostic endpoint returned 200${NC}"
  echo "Response: $DIAG_BODY"
else
  echo -e "${RED}❌ FAIL: Diagnostic endpoint returned $DIAG_CODE${NC}"
  echo "Response: $DIAG_BODY"
  exit 1
fi
echo ""

# All tests passed!
echo -e "${GREEN}🎉 All tests passed! MCP Base URL fix is working correctly.${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Configure OpenAI Agent Builder with base URL: $BASE_URL"
echo "2. Use custom header: Authorization: Bearer \$OPAI_AGENT_MCP_KEY"
echo "3. Verify connection shows 'Connected' status"
echo "4. Test listing and calling actions from OpenAI"
echo ""
echo -e "${GREEN}✅ MCP Base URL Handshake Fix Complete!${NC}"

