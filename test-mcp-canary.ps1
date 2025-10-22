# MCP Canary Verification Script
# Tests Vercel edge vs Railway backend to prove where requests land

param(
    [string]$Token = $env:OPAI_AGENT_MCP_KEY,
    [string]$VercelUrl = "https://api.ke3p.com",
    [string]$RailwayUrl = "https://keeper-platform-production.up.railway.app"
)

Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "MCP CANARY VERIFICATION" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

if (-not $Token) {
    Write-Host "❌ ERROR: OPAI_AGENT_MCP_KEY not set" -ForegroundColor Red
    Write-Host "Set environment variable or pass -Token parameter" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔑 Using API Key: $($Token.Substring(0, [Math]::Min(8, $Token.Length)))..." -ForegroundColor Gray
Write-Host ""

# Generate unique request ID for tracing
$RID = [Guid]::NewGuid().ToString()
Write-Host "📊 Request ID: $RID" -ForegroundColor Gray
Write-Host ""

# Prepare headers
$Headers = @{
    "Authorization" = "Bearer $Token"
    "Content-Type" = "application/json"
    "x-request-id" = $RID
}

# Test 1: Canary endpoint via Vercel
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 1: Canary Endpoint (Vercel → Railway)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "URL: $VercelUrl/mcp/_canary" -ForegroundColor Gray

try {
    $Response = Invoke-WebRequest -Uri "$VercelUrl/mcp/_canary" -Headers $Headers -UseBasicParsing -ErrorAction Stop
    $Body = $Response.Content | ConvertFrom-Json
    
    Write-Host "✅ Status: $($Response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ X-Keeper-Origin: $($Response.Headers['X-Keeper-Origin'])" -ForegroundColor Green
    Write-Host "✅ X-Keeper-Build: $($Response.Headers['X-Keeper-Build'])" -ForegroundColor Green
    Write-Host "✅ X-Keeper-Service: $($Response.Headers['X-Keeper-Service'])" -ForegroundColor Green
    Write-Host "✅ Body.origin: $($Body.origin)" -ForegroundColor Green
    Write-Host "✅ Body.why: $($Body.why)" -ForegroundColor Green
    
    if ($Response.StatusCode -eq 418 -and $Body.origin -eq "railway-api") {
        Write-Host "🎉 PASS: Canary reached Railway backend!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARN: Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: JSON-RPC list_actions via Vercel
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 2: JSON-RPC list_actions (Vercel → Railway)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "URL: $VercelUrl/mcp" -ForegroundColor Gray

$RpcBody = @{
    jsonrpc = "2.0"
    id = "test-list-$RID"
    method = "list_actions"
    params = @{}
} | ConvertTo-Json -Compress

try {
    $Response = Invoke-WebRequest -Uri "$VercelUrl/mcp" -Method Post -Headers $Headers -Body $RpcBody -UseBasicParsing -ErrorAction Stop
    $Body = $Response.Content | ConvertFrom-Json
    
    Write-Host "✅ Status: $($Response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ X-Keeper-Origin: $($Response.Headers['X-Keeper-Origin'])" -ForegroundColor Green
    Write-Host "✅ JSON-RPC ID: $($Body.id)" -ForegroundColor Green
    Write-Host "✅ Has result: $($null -ne $Body.result)" -ForegroundColor Green
    Write-Host "✅ Has canary: $($null -ne $Body.result.__keeper_canary)" -ForegroundColor Green
    
    if ($Body.result.__keeper_canary) {
        Write-Host "✅ Canary.origin: $($Body.result.__keeper_canary.origin)" -ForegroundColor Green
        Write-Host "✅ Canary.service: $($Body.result.__keeper_canary.service)" -ForegroundColor Green
        Write-Host "✅ Canary.build: $($Body.result.__keeper_canary.build)" -ForegroundColor Green
    }
    
    if ($Response.StatusCode -eq 200 -and $Body.result.__keeper_canary.origin -eq "railway-api") {
        Write-Host "🎉 PASS: JSON-RPC reached Railway backend!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARN: Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: JSON-RPC call_action via Vercel
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST 3: JSON-RPC call_action (Vercel → Railway)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "URL: $VercelUrl/mcp" -ForegroundColor Gray

$RpcCallBody = @{
    jsonrpc = "2.0"
    id = "test-call-$RID"
    method = "call_action"
    params = @{
        name = "gk_recent_moments"
        arguments = @{
            limit = 3
        }
    }
} | ConvertTo-Json -Compress

try {
    $Response = Invoke-WebRequest -Uri "$VercelUrl/mcp" -Method Post -Headers $Headers -Body $RpcCallBody -UseBasicParsing -ErrorAction Stop
    $Body = $Response.Content | ConvertFrom-Json
    
    Write-Host "✅ Status: $($Response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ X-Keeper-Origin: $($Response.Headers['X-Keeper-Origin'])" -ForegroundColor Green
    Write-Host "✅ JSON-RPC ID: $($Body.id)" -ForegroundColor Green
    Write-Host "✅ Has result: $($null -ne $Body.result)" -ForegroundColor Green
    Write-Host "✅ Has canary: $($null -ne $Body.result.__keeper_canary)" -ForegroundColor Green
    
    if ($Body.result.__keeper_canary) {
        Write-Host "✅ Canary.origin: $($Body.result.__keeper_canary.origin)" -ForegroundColor Green
    }
    
    if ($Response.StatusCode -eq 200 -and $Body.result.__keeper_canary.origin -eq "railway-api") {
        Write-Host "🎉 PASS: call_action reached Railway backend!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARN: Unexpected response" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Direct Railway comparison
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "TEST 4: Direct Railway (A/B Comparison)" -ForegroundColor Magenta
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "URL: $RailwayUrl/mcp/_canary" -ForegroundColor Gray

try {
    $Response = Invoke-WebRequest -Uri "$RailwayUrl/mcp/_canary" -Headers $Headers -UseBasicParsing -ErrorAction Stop
    $Body = $Response.Content | ConvertFrom-Json
    
    Write-Host "✅ Status: $($Response.StatusCode)" -ForegroundColor Green
    Write-Host "✅ X-Keeper-Origin: $($Response.Headers['X-Keeper-Origin'])" -ForegroundColor Green
    Write-Host "✅ Body.origin: $($Body.origin)" -ForegroundColor Green
    
    Write-Host "🎉 PASS: Direct Railway connection confirmed!" -ForegroundColor Green
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "SUMMARY" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ If all tests passed, MCP requests are reaching Railway" -ForegroundColor Green
Write-Host "✅ Check Railway logs for: [MCP TRACE] and [MCP CANARY]" -ForegroundColor Green
Write-Host "✅ Request ID for correlation: $RID" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Check Railway logs: railway logs | grep '$RID'" -ForegroundColor Gray
Write-Host "  2. Verify canary headers in all responses" -ForegroundColor Gray
Write-Host "  3. Test with OpenAI Agent Builder" -ForegroundColor Gray
Write-Host ""


