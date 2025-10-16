#!/bin/bash
# Cookie Authentication Diagnostic Script
# Tests the complete authentication flow and identifies cookie issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="${API_BASE:-https://api.ke3p.com}"
WEB_BASE="${WEB_BASE:-https://www.ke3p.com}"
TEST_EMAIL="${TEST_EMAIL:-}"
TEST_PASSWORD="${TEST_PASSWORD:-}"

echo -e "${BLUE}=== Cookie Authentication Diagnostic ===${NC}"
echo ""
echo "API Base: $API_BASE"
echo "Web Base: $WEB_BASE"
echo ""

# Check if credentials provided
if [ -z "$TEST_EMAIL" ] || [ -z "$TEST_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  No test credentials provided${NC}"
    echo "Usage: TEST_EMAIL=user@example.com TEST_PASSWORD=pass ./diagnose-cookie-auth.sh"
    echo ""
    echo "Continuing with general diagnostics..."
    echo ""
fi

# Test 1: Check API is reachable
echo -e "${BLUE}[1/7] Testing API reachability...${NC}"
if curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/ping" | grep -q "200"; then
    echo -e "${GREEN}✅ API is reachable${NC}"
else
    echo -e "${RED}❌ API is not reachable${NC}"
    exit 1
fi
echo ""

# Test 2: Check CORS headers
echo -e "${BLUE}[2/7] Checking CORS configuration...${NC}"
CORS_RESPONSE=$(curl -s -I -H "Origin: ${WEB_BASE}" "${API_BASE}/ping")
if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✅ CORS headers present${NC}"
    if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-credentials: true"; then
        echo -e "${GREEN}✅ Credentials allowed${NC}"
    else
        echo -e "${RED}❌ Credentials NOT allowed${NC}"
    fi
else
    echo -e "${RED}❌ CORS headers missing${NC}"
fi
echo ""

# Test 3: Login attempt (if credentials provided)
if [ -n "$TEST_EMAIL" ] && [ -n "$TEST_PASSWORD" ]; then
    echo -e "${BLUE}[3/7] Testing login flow...${NC}"
    
    # Create temp file for cookies
    COOKIE_FILE=$(mktemp)
    
    # Perform login
    LOGIN_RESPONSE=$(curl -s -w "\n%{http_code}" \
        -X POST "${API_BASE}/api/kam/auth/login" \
        -H "Content-Type: application/json" \
        -H "Origin: ${WEB_BASE}" \
        -c "$COOKIE_FILE" \
        -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}")
    
    HTTP_CODE=$(echo "$LOGIN_RESPONSE" | tail -n1)
    BODY=$(echo "$LOGIN_RESPONSE" | head -n-1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Login successful (200)${NC}"
        
        # Check response body
        if echo "$BODY" | grep -q '"success":true'; then
            echo -e "${GREEN}✅ Response format correct${NC}"
        else
            echo -e "${RED}❌ Response format incorrect${NC}"
            echo "Response: $BODY"
        fi
        
        # Test 4: Check Set-Cookie header
        echo ""
        echo -e "${BLUE}[4/7] Checking Set-Cookie header...${NC}"
        SET_COOKIE=$(curl -s -i -X POST "${API_BASE}/api/kam/auth/login" \
            -H "Content-Type: application/json" \
            -H "Origin: ${WEB_BASE}" \
            -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}" \
            | grep -i "^set-cookie:")
        
        if [ -n "$SET_COOKIE" ]; then
            echo -e "${GREEN}✅ Set-Cookie header present${NC}"
            echo "   $SET_COOKIE"
            
            # Check cookie attributes
            if echo "$SET_COOKIE" | grep -qi "httponly"; then
                echo -e "${GREEN}✅ HttpOnly flag set${NC}"
            else
                echo -e "${YELLOW}⚠️  HttpOnly flag missing${NC}"
            fi
            
            if echo "$SET_COOKIE" | grep -qi "secure"; then
                echo -e "${GREEN}✅ Secure flag set${NC}"
            else
                echo -e "${YELLOW}⚠️  Secure flag missing${NC}"
            fi
            
            if echo "$SET_COOKIE" | grep -qi "samesite"; then
                SAMESITE_VALUE=$(echo "$SET_COOKIE" | grep -oi "samesite=[^;]*" | cut -d= -f2)
                echo -e "${GREEN}✅ SameSite set to: $SAMESITE_VALUE${NC}"
                if [ "$SAMESITE_VALUE" != "None" ] && [ "$SAMESITE_VALUE" != "none" ]; then
                    echo -e "${YELLOW}⚠️  SameSite should be 'None' for cross-domain${NC}"
                fi
            else
                echo -e "${YELLOW}⚠️  SameSite not set${NC}"
            fi
            
            if echo "$SET_COOKIE" | grep -qi "domain="; then
                DOMAIN_VALUE=$(echo "$SET_COOKIE" | grep -oi "domain=[^;]*" | cut -d= -f2)
                echo -e "${GREEN}✅ Domain set to: $DOMAIN_VALUE${NC}"
                if [[ ! "$DOMAIN_VALUE" =~ ^\..*$ ]]; then
                    echo -e "${YELLOW}⚠️  Domain should start with '.' for subdomain sharing${NC}"
                fi
            else
                echo -e "${RED}❌ Domain not set (cookie will be host-only)${NC}"
            fi
        else
            echo -e "${RED}❌ Set-Cookie header NOT present${NC}"
            echo -e "${RED}   This is the root cause - cookie is not being set!${NC}"
        fi
        
        # Test 5: Check cookie file
        echo ""
        echo -e "${BLUE}[5/7] Checking saved cookies...${NC}"
        if [ -s "$COOKIE_FILE" ]; then
            echo -e "${GREEN}✅ Cookie file has content${NC}"
            if grep -q "keeper_session" "$COOKIE_FILE"; then
                echo -e "${GREEN}✅ keeper_session cookie found${NC}"
                grep "keeper_session" "$COOKIE_FILE"
            else
                echo -e "${RED}❌ keeper_session cookie not found${NC}"
                echo "Cookie file content:"
                cat "$COOKIE_FILE"
            fi
        else
            echo -e "${RED}❌ Cookie file is empty${NC}"
        fi
        
        # Test 6: Test authenticated endpoint
        echo ""
        echo -e "${BLUE}[6/7] Testing authenticated endpoint...${NC}"
        ME_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -b "$COOKIE_FILE" \
            -H "Origin: ${WEB_BASE}" \
            "${API_BASE}/api/kam/me")
        
        ME_HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
        ME_BODY=$(echo "$ME_RESPONSE" | head -n-1)
        
        if [ "$ME_HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✅ Authenticated endpoint works (200)${NC}"
            echo "Response: $ME_BODY"
        else
            echo -e "${RED}❌ Authenticated endpoint failed ($ME_HTTP_CODE)${NC}"
            echo "Response: $ME_BODY"
            echo ""
            echo -e "${RED}This confirms the authentication issue!${NC}"
        fi
        
        # Test 7: Test whoami endpoint
        echo ""
        echo -e "${BLUE}[7/7] Testing /api/whoami endpoint...${NC}"
        WHOAMI_RESPONSE=$(curl -s -w "\n%{http_code}" \
            -b "$COOKIE_FILE" \
            "${API_BASE}/api/whoami")
        
        WHOAMI_HTTP_CODE=$(echo "$WHOAMI_RESPONSE" | tail -n1)
        WHOAMI_BODY=$(echo "$WHOAMI_RESPONSE" | head -n-1)
        
        if [ "$WHOAMI_HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✅ /api/whoami works (200)${NC}"
            echo "Response: $WHOAMI_BODY"
        else
            echo -e "${RED}❌ /api/whoami failed ($WHOAMI_HTTP_CODE)${NC}"
            echo "Response: $WHOAMI_BODY"
        fi
        
        # Cleanup
        rm -f "$COOKIE_FILE"
    else
        echo -e "${RED}❌ Login failed ($HTTP_CODE)${NC}"
        echo "Response: $BODY"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  Skipping login tests (no credentials)${NC}"
    echo ""
    echo -e "${BLUE}[3/7] Skipped - No credentials${NC}"
    echo -e "${BLUE}[4/7] Skipped - No credentials${NC}"
    echo -e "${BLUE}[5/7] Skipped - No credentials${NC}"
    echo -e "${BLUE}[6/7] Skipped - No credentials${NC}"
    echo -e "${BLUE}[7/7] Skipped - No credentials${NC}"
fi

echo ""
echo -e "${BLUE}=== Diagnostic Summary ===${NC}"
echo ""
echo "If Set-Cookie header is missing:"
echo "  1. Check COOKIE_DOMAIN env var in Railway"
echo "  2. Should be exactly: .ke3p.com (with leading dot)"
echo "  3. Check Railway logs for [DEBUG] setSessionCookie messages"
echo ""
echo "If Set-Cookie is present but cookie doesn't work:"
echo "  1. Check Domain attribute (should be .ke3p.com)"
echo "  2. Check SameSite attribute (should be None)"
echo "  3. Check Secure flag (should be present)"
echo ""
echo "See AUTH_SESSION_COOKIE_ROOT_CAUSE_ANALYSIS.md for detailed analysis"
echo ""

