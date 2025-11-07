#!/bin/bash

# Test script to verify image upload configuration
# Run this to diagnose upload issues

echo "🔍 Keeper Platform - Upload Configuration Test"
echo "==============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check if API server is running
echo "Test 1: API Server Connectivity"
echo "--------------------------------"
API_URL="${API_URL:-http://localhost:3001}"
if curl -s -f "$API_URL/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} API server is reachable at $API_URL"
else
    echo -e "${RED}✗${NC} Cannot reach API server at $API_URL"
    echo "  Make sure the API server is running: cd apps/api && pnpm dev"
    exit 1
fi
echo ""

# Test 2: Check environment variables
echo "Test 2: Environment Variables"
echo "------------------------------"

# Check for BLOB_READ_WRITE_TOKEN
if [ -f "apps/api/.env" ]; then
    if grep -q "BLOB_READ_WRITE_TOKEN=" apps/api/.env; then
        TOKEN_VALUE=$(grep "BLOB_READ_WRITE_TOKEN=" apps/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        if [ -n "$TOKEN_VALUE" ] && [ "$TOKEN_VALUE" != "" ]; then
            echo -e "${GREEN}✓${NC} BLOB_READ_WRITE_TOKEN is set in apps/api/.env"
        else
            echo -e "${RED}✗${NC} BLOB_READ_WRITE_TOKEN is empty in apps/api/.env"
            echo "  Get your token from: https://vercel.com/dashboard/stores"
        fi
    else
        echo -e "${RED}✗${NC} BLOB_READ_WRITE_TOKEN not found in apps/api/.env"
        echo "  Add: BLOB_READ_WRITE_TOKEN=\"vercel_blob_rw_...\""
    fi
else
    echo -e "${YELLOW}⚠${NC} apps/api/.env file not found"
    echo "  Create it from env-example.txt"
fi

# Check CORS settings
if [ -f "apps/api/.env" ]; then
    if grep -q "CORS_ALLOWLIST=" apps/api/.env; then
        echo -e "${GREEN}✓${NC} CORS_ALLOWLIST is configured"
    else
        echo -e "${YELLOW}⚠${NC} CORS_ALLOWLIST not found in apps/api/.env"
        echo "  Consider adding your frontend URL"
    fi
fi

# Check web app API URL
if [ -f "apps/web/.env" ]; then
    if grep -q "VITE_API_URL=" apps/web/.env; then
        API_URL_VALUE=$(grep "VITE_API_URL=" apps/web/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
        echo -e "${GREEN}✓${NC} VITE_API_URL is set to: $API_URL_VALUE"
    else
        echo -e "${YELLOW}⚠${NC} VITE_API_URL not found in apps/web/.env"
        echo "  Frontend will use default API URL"
    fi
else
    echo -e "${YELLOW}⚠${NC} apps/web/.env file not found"
fi
echo ""

# Test 3: Test upload sign endpoint (requires authentication)
echo "Test 3: Upload Sign Endpoint"
echo "-----------------------------"
SIGN_RESPONSE=$(curl -s -X POST "$API_URL/api/uploads/sign" \
    -H "Content-Type: application/json" \
    -d '{"filename":"test.jpg","contentType":"image/jpeg","size":1024}' 2>&1)

if echo "$SIGN_RESPONSE" | grep -q '"success":false'; then
    ERROR_MSG=$(echo "$SIGN_RESPONSE" | grep -o '"error":"[^"]*"' | cut -d'"' -f4)
    if echo "$ERROR_MSG" | grep -qi "unauthorized"; then
        echo -e "${YELLOW}⚠${NC} Endpoint requires authentication (expected)"
        echo "  This is normal - uploads require login"
    elif echo "$ERROR_MSG" | grep -qi "storage not configured"; then
        echo -e "${RED}✗${NC} BLOB_READ_WRITE_TOKEN not configured on server"
        echo "  Set BLOB_READ_WRITE_TOKEN in apps/api/.env and restart server"
    else
        echo -e "${YELLOW}⚠${NC} Error: $ERROR_MSG"
    fi
elif echo "$SIGN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC} Upload sign endpoint is working"
else
    echo -e "${RED}✗${NC} Unexpected response from upload endpoint"
    echo "  Response: $SIGN_RESPONSE"
fi
echo ""

# Test 4: Check Vercel Blob connectivity (if token is available)
echo "Test 4: Vercel Blob Connectivity"
echo "---------------------------------"
if [ -f "apps/api/.env" ]; then
    TOKEN_VALUE=$(grep "BLOB_READ_WRITE_TOKEN=" apps/api/.env | cut -d'=' -f2 | tr -d '"' | tr -d "'")
    if [ -n "$TOKEN_VALUE" ] && [ "$TOKEN_VALUE" != "" ] && [ "$TOKEN_VALUE" != "vercel_blob_rw_..." ]; then
        # Try to list blobs (this will fail without proper setup but validates token format)
        if echo "$TOKEN_VALUE" | grep -q "^vercel_blob_rw_"; then
            echo -e "${GREEN}✓${NC} Token format appears valid"
        else
            echo -e "${RED}✗${NC} Token format looks invalid"
            echo "  Should start with: vercel_blob_rw_"
        fi
    else
        echo -e "${YELLOW}⚠${NC} No valid token to test"
    fi
else
    echo -e "${YELLOW}⚠${NC} Cannot test - .env file not found"
fi
echo ""

# Summary
echo "Summary & Next Steps"
echo "===================="
echo ""
echo "To fix upload issues:"
echo ""
echo "1. Get Vercel Blob token:"
echo "   → Visit: https://vercel.com/dashboard/stores"
echo "   → Create a Blob store or use existing one"
echo "   → Copy the Read/Write Token"
echo ""
echo "2. Configure API server:"
echo "   → Add to apps/api/.env:"
echo "     BLOB_READ_WRITE_TOKEN=\"vercel_blob_rw_...\""
echo "   → Restart API server: cd apps/api && pnpm dev"
echo ""
echo "3. Configure web app (optional):"
echo "   → Add to apps/web/.env:"
echo "     VITE_API_URL=\"http://localhost:3001\""
echo "   → Restart web server: cd apps/web && pnpm dev"
echo ""
echo "4. Test in browser:"
echo "   → Log in to the application"
echo "   → Try uploading an image"
echo "   → Check browser console for errors"
echo ""
echo "For more help, see: UPLOAD_DEBUG_GUIDE.md"
echo ""


