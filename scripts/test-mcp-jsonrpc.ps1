# MCP JSON-RPC Test Script
# Tests the JSON-RPC 2.0 endpoints for OpenAI Agent Builder compatibility
# Usage: .\scripts\test-mcp-jsonrpc.ps1

Write-Host "🧪 MCP JSON-RPC Test Suite" -ForegroundColor Cyan
Write-Host "Testing JSON-RPC 2.0 endpoints for OpenAI Agent Builder compatibility" -ForegroundColor Gray
Write-Host ""

# Configuration
$baseUrl = "https://api.ke3p.com/mcp"
$apiKey = $env:OPAI_AGENT_MCP_KEY

if (-not $apiKey) {
    Write-Host "❌ Error: OPAI_AGENT_MCP_KEY environment variable not set" -ForegroundColor Red
    Write-Host "Set it with: `$env:OPAI_AGENT_MCP_KEY='your-key-here'" -ForegroundColor Yellow
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $apiKey"
    "Content-Type" = "application/json"
}

Write-Host "🔧 Configuration:" -ForegroundColor White
Write-Host "  Base URL: $baseUrl" -ForegroundColor Gray
Write-Host "  API Key: ${apiKey.Substring(0, [Math]::Min(10, $apiKey.Length))}..." -ForegroundColor Gray
Write-Host ""

# Test counter
$testsPassed = 0
$testsFailed = 0

function Test-JsonRpcEndpoint {
    param(
        [string]$TestName,
        [string]$Method,
        [hashtable]$Params = @{}
    )
    
    Write-Host "📝 Test: $TestName" -ForegroundColor White
    
    $requestId = "test-$(Get-Random)"
    $body = @{
        jsonrpc = "2.0"
        id = $requestId
        method = $Method
        params = $Params
    } | ConvertTo-Json -Depth 10
    
    try {
        $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
        
        # Validate JSON-RPC response structure
        if ($response.jsonrpc -ne "2.0") {
            Write-Host "  ❌ FAIL: Invalid jsonrpc version" -ForegroundColor Red
            $script:testsFailed++
            return
        }
        
        if ($response.id -ne $requestId) {
            Write-Host "  ⚠️  WARN: Response ID doesn't match request ID" -ForegroundColor Yellow
        }
        
        if ($response.PSObject.Properties.Name -contains "error") {
            Write-Host "  ❌ FAIL: Error response" -ForegroundColor Red
            Write-Host "  Error: $($response.error.message)" -ForegroundColor Red
            $script:testsFailed++
            return
        }
        
        if (-not ($response.PSObject.Properties.Name -contains "result")) {
            Write-Host "  ❌ FAIL: No result field in response" -ForegroundColor Red
            $script:testsFailed++
            return
        }
        
        Write-Host "  ✅ PASS" -ForegroundColor Green
        Write-Host "  Response: $($response.result | ConvertTo-Json -Compress)" -ForegroundColor Gray
        $script:testsPassed++
    }
    catch {
        Write-Host "  ❌ FAIL: HTTP request failed" -ForegroundColor Red
        Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
        $script:testsFailed++
    }
    
    Write-Host ""
}

# Test 1: list_actions
Test-JsonRpcEndpoint -TestName "List Actions" -Method "list_actions"

# Test 2: capabilities
Test-JsonRpcEndpoint -TestName "Get Capabilities" -Method "capabilities"

# Test 3: call_action with gk_recent_moments
Test-JsonRpcEndpoint -TestName "Call Action: gk_recent_moments" -Method "call_action" -Params @{
    name = "gk_recent_moments"
    arguments = @{
        limit = 3
    }
}

# Test 4: call_action with pool_create_quote
Test-JsonRpcEndpoint -TestName "Call Action: pool_create_quote" -Method "call_action" -Params @{
    name = "pool_create_quote"
    arguments = @{
        projectId = "test-proj-123"
        craneOverHouse = $true
        includesHeatPump = $false
    }
}

# Test 5: Invalid method (should fail gracefully)
Write-Host "📝 Test: Invalid Method (should return error)" -ForegroundColor White
$requestId = "test-$(Get-Random)"
$body = @{
    jsonrpc = "2.0"
    id = $requestId
    method = "invalid_method"
    params = @{}
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    if ($response.PSObject.Properties.Name -contains "error") {
        if ($response.error.code -eq -32601) {
            Write-Host "  ✅ PASS: Correct error code for method not found" -ForegroundColor Green
            $testsPassed++
        } else {
            Write-Host "  ⚠️  WARN: Unexpected error code: $($response.error.code)" -ForegroundColor Yellow
            $testsPassed++
        }
    } else {
        Write-Host "  ❌ FAIL: Should have returned an error" -ForegroundColor Red
        $testsFailed++
    }
}
catch {
    Write-Host "  ⚠️  HTTP error (expected for invalid method)" -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    $testsPassed++
}
Write-Host ""

# Test 6: Minimal format (alternative to JSON-RPC)
Write-Host "📝 Test: Minimal Format (alternative)" -ForegroundColor White
$body = @{
    action = "list_actions"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $baseUrl -Method Post -Headers $headers -Body $body -ErrorAction Stop
    
    if ($response.PSObject.Properties.Name -contains "result") {
        Write-Host "  ✅ PASS: Minimal format accepted" -ForegroundColor Green
        $testsPassed++
    } else {
        Write-Host "  ❌ FAIL: Invalid response structure" -ForegroundColor Red
        $testsFailed++
    }
}
catch {
    Write-Host "  ❌ FAIL: Minimal format not supported" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    $testsFailed++
}
Write-Host ""

# Summary
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host "📊 Test Results:" -ForegroundColor Cyan
Write-Host "  ✅ Passed: $testsPassed" -ForegroundColor Green
Write-Host "  ❌ Failed: $testsFailed" -ForegroundColor $(if ($testsFailed -eq 0) { "Green" } else { "Red" })
Write-Host "  📈 Total:  $($testsPassed + $testsFailed)" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White
Write-Host ""

if ($testsFailed -eq 0) {
    Write-Host "🎉 All tests passed! MCP JSON-RPC endpoints are working correctly." -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some tests failed. Please review the errors above." -ForegroundColor Yellow
    exit 1
}

