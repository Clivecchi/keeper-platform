#!/bin/bash

# Domain Board Management Smoke Test Script
# Tests all 6 board management endpoints with dry-run mode

set -e

API_URL="${API_URL:-http://localhost:4000}"
TOKEN="${AUTH_TOKEN:-}"
BOARD_ID="${TEST_BOARD_ID:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ Error: AUTH_TOKEN environment variable not set"
  echo "Usage: AUTH_TOKEN=your_token TEST_BOARD_ID=board_uuid ./scripts/test-board-management.sh"
  exit 1
fi

if [ -z "$BOARD_ID" ]; then
  echo "❌ Error: TEST_BOARD_ID environment variable not set"
  echo "Usage: AUTH_TOKEN=your_token TEST_BOARD_ID=board_uuid ./scripts/test-board-management.sh"
  exit 1
fi

echo "🧪 Testing Domain Board Management Endpoints"
echo "============================================="
echo "API URL: $API_URL"
echo "Board ID: $BOARD_ID"
echo ""

# Test 1: Set Viewer Mode (dry-run)
echo "1️⃣  Testing setViewerMode (dry-run)..."
curl -s -X PATCH "$API_URL/api/boards/$BOARD_ID/viewer-mode" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "mode": "public",
    "dryRun": true
  }' | jq '.'
echo ""

# Test 2: Add Frame (dry-run)
echo "2️⃣  Testing addFrame (dry-run)..."
curl -s -X POST "$API_URL/api/boards/$BOARD_ID/frames" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "pattern": "dialogic",
    "name": "Test Frame",
    "dryRun": true
  }' | jq '.'
echo ""

# Test 3: Update Frame (dry-run) - will fail gracefully if no frames exist
echo "3️⃣  Testing updateFrame (dry-run)..."
FRAME_ID="00000000-0000-0000-0000-000000000000"
curl -s -X PATCH "$API_URL/api/boards/frames/$FRAME_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "patch": {"name": "Updated Name"},
    "dryRun": true
  }' | jq '.'
echo ""

# Test 4: Set Cover (dry-run)
echo "4️⃣  Testing setCover (dry-run)..."
# 1x1 transparent PNG in base64
BASE64_PNG="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
curl -s -X POST "$API_URL/api/boards/$BOARD_ID/cover" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"mime\": \"image/png\",
    \"name\": \"test-cover.png\",
    \"bytesBase64\": \"$BASE64_PNG\",
    \"dryRun\": true
  }" | jq '.'
echo ""

# Test 5: Upsert Navigation (dry-run)
echo "5️⃣  Testing upsertPathwayNav (dry-run)..."
curl -s -X PUT "$API_URL/api/boards/$BOARD_ID/nav" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "items": [
      {"label": "Home", "href": "/", "icon": "home"},
      {"label": "About", "href": "/about", "icon": "info"}
    ],
    "dryRun": true
  }' | jq '.'
echo ""

# Test 6: Publish Board (dry-run)
echo "6️⃣  Testing publish (dry-run)..."
curl -s -X PATCH "$API_URL/api/boards/$BOARD_ID/publish" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "isPublic": true,
    "dryRun": true
  }' | jq '.'
echo ""

echo "✅ Smoke tests complete!"
echo ""
echo "Next steps:"
echo "  1. Review the responses above"
echo "  2. Run actual operations by removing dryRun flag"
echo "  3. Check audit logs in console/database"

