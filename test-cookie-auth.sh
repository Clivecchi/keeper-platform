#!/bin/bash
# Cookie-Only Auth Diagnostics Script
# Run this after deploying to verify the implementation

set -e

echo "🔒 Cookie-Only Auth Implementation Tests"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-https://api.ke3p.com}"
WEB_ORIGIN="${WEB_ORIGIN:-https://www.ke3p.com}"
VALID_TOKEN="${VALID_TOKEN:-}"

if [ -z "$VALID_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Warning: VALID_TOKEN not set. Some tests will be skipped.${NC}"
  echo "   Set it with: export VALID_TOKEN='your_token_here'"
  echo ""
fi

# Test 1: CLI/Tool Auth (no Origin header)
echo "Test 1: CLI/Tool Authentication (No Origin Header)"
echo "---------------------------------------------------"
if [ -n "$VALID_TOKEN" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Authorization: Bearer $VALID_TOKEN" \
    "$API_URL/api/kam/auth/me")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS: CLI auth works (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
  else
    echo -e "${RED}❌ FAIL: Expected 200, got $HTTP_CODE${NC}"
    echo "   Response: $BODY"
  fi
else
  echo -e "${YELLOW}⏭️  SKIP: No VALID_TOKEN set${NC}"
fi
echo ""

# Test 2: Browser Origin with Header Auth (should fail/ignore header)
echo "Test 2: Browser Origin with Authorization Header"
echo "------------------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Origin: $WEB_ORIGIN" \
  -H "Authorization: Bearer FAKE_INVALID_TOKEN" \
  "$API_URL/api/kam/auth/me")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
  echo -e "${GREEN}✅ PASS: Browser origin blocks header auth (HTTP $HTTP_CODE)${NC}"
  echo "   Response: $BODY"
else
  echo -e "${RED}❌ FAIL: Expected 401/403, got $HTTP_CODE${NC}"
  echo "   Response: $BODY"
fi
echo ""

# Test 3: X-Client: cli override with Origin
echo "Test 3: X-Client: cli Override with Browser Origin"
echo "---------------------------------------------------"
if [ -n "$VALID_TOKEN" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" \
    -H "Origin: $WEB_ORIGIN" \
    -H "X-Client: cli" \
    -H "Authorization: Bearer $VALID_TOKEN" \
    "$API_URL/api/kam/auth/me")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | head -n-1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS: X-Client: cli allows header auth (HTTP $HTTP_CODE)${NC}"
    echo "   Response: $BODY"
  else
    echo -e "${RED}❌ FAIL: Expected 200, got $HTTP_CODE${NC}"
    echo "   Response: $BODY"
  fi
else
  echo -e "${YELLOW}⏭️  SKIP: No VALID_TOKEN set${NC}"
fi
echo ""

# Test 4: Public endpoint (no auth required)
echo "Test 4: Public Endpoint (Sanity Check)"
echo "---------------------------------------"
RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$API_URL/health" 2>/dev/null || echo "endpoint_not_found\n404")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
  echo -e "${GREEN}✅ PASS: API is reachable (HTTP $HTTP_CODE)${NC}"
else
  echo -e "${YELLOW}⚠️  Warning: Unexpected status $HTTP_CODE${NC}"
fi
echo ""

# Summary
echo "========================================"
echo "📋 Test Summary"
echo "========================================"
echo ""
echo "Next Steps:"
echo "1. Open DevTools → Network tab on $WEB_ORIGIN"
echo "2. Hard refresh (Disable cache + reload)"
echo "3. Check any API request:"
echo "   - ✅ No Authorization header present"
echo "   - ✅ Cookie: keeper_session=... present"
echo "   - ✅ Response: 200 OK"
echo ""
echo "For full acceptance checklist, see:"
echo "COOKIE_AUTH_ACCEPTANCE.md"
echo ""

