# Domain Board Management Smoke Test Script (PowerShell)
# Tests all 6 board management endpoints with dry-run mode

param(
    [string]$ApiUrl = "http://localhost:4000",
    [Parameter(Mandatory=$true)]
    [string]$Token,
    [Parameter(Mandatory=$true)]
    [string]$BoardId
)

Write-Host "🧪 Testing Domain Board Management Endpoints" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "API URL: $ApiUrl"
Write-Host "Board ID: $BoardId"
Write-Host ""

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $Token"
}

# Test 1: Set Viewer Mode (dry-run)
Write-Host "1️⃣  Testing setViewerMode (dry-run)..." -ForegroundColor Yellow
$body = @{
    mode = "public"
    dryRun = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/boards/$BoardId/viewer-mode" `
        -Method PATCH -Headers $headers -Body $body
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 2: Add Frame (dry-run)
Write-Host "2️⃣  Testing addFrame (dry-run)..." -ForegroundColor Yellow
$body = @{
    pattern = "dialogic"
    name = "Test Frame"
    dryRun = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/boards/$BoardId/frames" `
        -Method POST -Headers $headers -Body $body
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 3: Update Frame (dry-run)
Write-Host "3️⃣  Testing updateFrame (dry-run)..." -ForegroundColor Yellow
$frameId = "00000000-0000-0000-0000-000000000000"
$body = @{
    patch = @{ name = "Updated Name" }
    dryRun = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/boards/frames/$frameId" `
        -Method PATCH -Headers $headers -Body $body
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 4: Set Cover (dry-run)
Write-Host "4️⃣  Testing setCover (dry-run)..." -ForegroundColor Yellow
$body = @{
    mime = "image/png"
    name = "test-cover.png"
    bytesBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
    dryRun = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/boards/$BoardId/cover" `
        -Method POST -Headers $headers -Body $body
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 5: Upsert Navigation (dry-run)
Write-Host "5️⃣  Testing upsertPathwayNav (dry-run)..." -ForegroundColor Yellow
$body = @{
    items = @(
        @{ label = "Home"; href = "/"; icon = "home" },
        @{ label = "About"; href = "/about"; icon = "info" }
    )
    dryRun = $true
} | ConvertTo-Json -Depth 3

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/boards/$BoardId/nav" `
        -Method PUT -Headers $headers -Body $body
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

# Test 6: Publish Board (dry-run)
Write-Host "6️⃣  Testing publish (dry-run)..." -ForegroundColor Yellow
$body = @{
    isPublic = $true
    dryRun = $true
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/boards/$BoardId/publish" `
        -Method PATCH -Headers $headers -Body $body
    $response | ConvertTo-Json | Write-Host
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "✅ Smoke tests complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Review the responses above"
Write-Host "  2. Run actual operations by removing dryRun flag"
Write-Host "  3. Check audit logs in console/database"

