# MCP Credentials and Origin Echo Test Script
# Tests that OpenAI Agent Builder can connect with credentialled requests

$ErrorActionPreference = "Continue"

Write-Host "🔒 MCP Credentials & Origin Echo Tests" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SCHEMA = "https://api.ke3p.com/api/mcp/schema"
$ROOT = "https://api.ke3p.com/api/mcp/"
$KEY = "sk_keeper_opai_Qm5r8Gq9X2rQfZ3fL9aB8vD6kP2vC8sL5aU1cE7rJ9sB3xY2dF1"
$ORIGIN = "https://platform.openai.com"

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  API URL: $SCHEMA" -ForegroundColor Gray
Write-Host "  Origin:  $ORIGIN" -ForegroundColor Gray
Write-Host "  Key:     sk_keeper_opai_...${KEY.Substring($KEY.Length - 8)}" -ForegroundColor Gray
Write-Host ""

# Test 1: OPTIONS Preflight with Origin
Write-Host "Test 1: OPTIONS Preflight with Origin" -ForegroundColor Green
Write-Host "--------------------------------------" -ForegroundColor Green
try {
    $response = Invoke-WebRequest $SCHEMA -Method Options -Headers @{
        Origin = $ORIGIN
        "Access-Control-Request-Method" = "GET"
        "Access-Control-Request-Headers" = "authorization,x-api-key,content-type,x-domain-id"
    }
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $allowCreds = $response.Headers["Access-Control-Allow-Credentials"]
    $allowMethods = $response.Headers["Access-Control-Allow-Methods"]
    $allowHeaders = $response.Headers["Access-Control-Allow-Headers"]
    $vary = $response.Headers["Vary"]
    
    Write-Host "Headers:" -ForegroundColor Cyan
    Write-Host "  Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor $(if ($allowOrigin -eq $ORIGIN) { "Green" } else { "Red" })
    Write-Host "  Access-Control-Allow-Credentials: $allowCreds" -ForegroundColor $(if ($allowCreds -eq "true") { "Green" } else { "Red" })
    Write-Host "  Access-Control-Allow-Methods: $allowMethods" -ForegroundColor Gray
    Write-Host "  Access-Control-Allow-Headers: $allowHeaders" -ForegroundColor Gray
    Write-Host "  Vary: $vary" -ForegroundColor $(if ($vary -eq "Origin") { "Green" } else { "Red" })
    
    if ($allowOrigin -eq $ORIGIN) {
        Write-Host "✅ PASS: Origin echoed correctly" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Expected Origin $ORIGIN, got $allowOrigin" -ForegroundColor Red
    }
    
    if ($allowCreds -eq "true") {
        Write-Host "✅ PASS: Credentials allowed" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Credentials not allowed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: GET with x-api-key and Origin
Write-Host "Test 2: GET with x-api-key and Origin" -ForegroundColor Green
Write-Host "--------------------------------------" -ForegroundColor Green
try {
    $response = Invoke-WebRequest $SCHEMA -Method Get -Headers @{
        Origin = $ORIGIN
        "x-api-key" = $KEY
    }
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $allowCreds = $response.Headers["Access-Control-Allow-Credentials"]
    $contentType = $response.Headers["Content-Type"]
    
    Write-Host "Headers:" -ForegroundColor Cyan
    Write-Host "  Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor $(if ($allowOrigin -eq $ORIGIN) { "Green" } else { "Red" })
    Write-Host "  Access-Control-Allow-Credentials: $allowCreds" -ForegroundColor $(if ($allowCreds -eq "true") { "Green" } else { "Red" })
    Write-Host "  Content-Type: $contentType" -ForegroundColor Gray
    
    if ($allowOrigin -eq $ORIGIN) {
        Write-Host "✅ PASS: Origin echoed correctly" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Expected Origin $ORIGIN, got $allowOrigin" -ForegroundColor Red
    }
    
    $json = $response.Content | ConvertFrom-Json
    if ($json.tools) {
        Write-Host "✅ PASS: Schema loaded with $($json.tools.Count) tools" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: No tools in response" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: GET with Authorization Bearer and Origin
Write-Host "Test 3: GET with Authorization Bearer and Origin" -ForegroundColor Green
Write-Host "------------------------------------------------" -ForegroundColor Green
try {
    $response = Invoke-WebRequest $SCHEMA -Method Get -Headers @{
        Origin = $ORIGIN
        Authorization = "Bearer $KEY"
    }
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $allowCreds = $response.Headers["Access-Control-Allow-Credentials"]
    
    Write-Host "Headers:" -ForegroundColor Cyan
    Write-Host "  Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor $(if ($allowOrigin -eq $ORIGIN) { "Green" } else { "Red" })
    Write-Host "  Access-Control-Allow-Credentials: $allowCreds" -ForegroundColor $(if ($allowCreds -eq "true") { "Green" } else { "Red" })
    
    if ($allowOrigin -eq $ORIGIN) {
        Write-Host "✅ PASS: Origin echoed with Bearer token" -ForegroundColor Green
    } else {
        Write-Host "❌ FAIL: Expected Origin $ORIGIN, got $allowOrigin" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: GET without Origin (fallback to *)
Write-Host "Test 4: GET without Origin (fallback to *)" -ForegroundColor Green
Write-Host "-------------------------------------------" -ForegroundColor Green
try {
    $response = Invoke-WebRequest $ROOT -Method Get -Headers @{
        Authorization = "Bearer $KEY"
    }
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $allowOrigin = $response.Headers["Access-Control-Allow-Origin"]
    $allowCreds = $response.Headers["Access-Control-Allow-Credentials"]
    
    Write-Host "Headers:" -ForegroundColor Cyan
    Write-Host "  Access-Control-Allow-Origin: $allowOrigin" -ForegroundColor $(if ($allowOrigin -eq "*") { "Green" } else { "Yellow" })
    Write-Host "  Access-Control-Allow-Credentials: $allowCreds" -ForegroundColor Gray
    
    if ($allowOrigin -eq "*") {
        Write-Host "✅ PASS: Defaults to * when no Origin header" -ForegroundColor Green
    } else {
        Write-Host "⚠️  INFO: Got $allowOrigin instead of * (may be OK)" -ForegroundColor Yellow
    }
    
    $json = $response.Content | ConvertFrom-Json
    if ($json.ok -eq $true) {
        Write-Host "✅ PASS: Health check returned ok: true" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: HEAD Request (unauthenticated discovery)
Write-Host "Test 5: HEAD Request (unauthenticated discovery)" -ForegroundColor Green
Write-Host "-------------------------------------------------" -ForegroundColor Green
try {
    $response = Invoke-WebRequest $SCHEMA -Method Head
    
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    
    $contentType = $response.Headers["Content-Type"]
    Write-Host "  Content-Type: $contentType" -ForegroundColor Gray
    
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ PASS: HEAD allowed without authentication" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ FAIL: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "📋 Test Summary" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Expected Results:" -ForegroundColor Green
Write-Host "  - OPTIONS returns 200 with Origin echo" -ForegroundColor Gray
Write-Host "  - Access-Control-Allow-Origin: $ORIGIN (not *)" -ForegroundColor Gray
Write-Host "  - Access-Control-Allow-Credentials: true" -ForegroundColor Gray
Write-Host "  - GET with x-api-key works" -ForegroundColor Gray
Write-Host "  - GET with Authorization Bearer works" -ForegroundColor Gray
Write-Host "  - HEAD works without auth" -ForegroundColor Gray
Write-Host ""
Write-Host "🤖 OpenAI Agent Builder Configuration:" -ForegroundColor Yellow
Write-Host "  Base URL: https://api.ke3p.com/api/mcp" -ForegroundColor Gray
Write-Host "  Auth: Bearer Token" -ForegroundColor Gray
Write-Host "  Key: $KEY" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected Status: Connected ✅" -ForegroundColor Green
Write-Host ""

