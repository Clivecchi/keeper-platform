# Test script to verify image upload configuration
# Run this to diagnose upload issues: .\test-upload-config.ps1

Write-Host ""
Write-Host "Keeper Platform - Upload Configuration Test" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if API server is running
Write-Host "Test 1: API Server Connectivity" -ForegroundColor Yellow
Write-Host "--------------------------------" -ForegroundColor Yellow
$ApiUrl = if ($env:API_URL) { $env:API_URL } else { "http://localhost:3001" }

try {
    $response = Invoke-WebRequest -Uri "$ApiUrl/health" -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "Success: API server is reachable at $ApiUrl" -ForegroundColor Green
    }
}
catch {
    Write-Host "Error: Cannot reach API server at $ApiUrl" -ForegroundColor Red
    Write-Host "  Make sure the API server is running: cd apps/api; pnpm dev" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Test 2: Check environment variables
Write-Host "Test 2: Environment Variables" -ForegroundColor Yellow
Write-Host "------------------------------" -ForegroundColor Yellow

# Check for BLOB_READ_WRITE_TOKEN
$apiEnvPath = "apps\api\.env"
if (Test-Path $apiEnvPath) {
    $envContent = Get-Content $apiEnvPath -Raw
    if ($envContent -match 'BLOB_READ_WRITE_TOKEN\s*=\s*(.+)') {
        $tokenValue = $matches[1].Trim().Trim('"').Trim("'")
        if ($tokenValue -and $tokenValue -ne "") {
            Write-Host "Success: BLOB_READ_WRITE_TOKEN is set in apps/api/.env" -ForegroundColor Green
        }
        else {
            Write-Host "Error: BLOB_READ_WRITE_TOKEN is empty in apps/api/.env" -ForegroundColor Red
            Write-Host "  Get your token from: https://vercel.com/dashboard/stores" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Error: BLOB_READ_WRITE_TOKEN not found in apps/api/.env" -ForegroundColor Red
        Write-Host "  Add: BLOB_READ_WRITE_TOKEN=`"vercel_blob_rw_...`"" -ForegroundColor Red
    }
}
else {
    Write-Host "Warning: apps/api/.env file not found" -ForegroundColor Yellow
    Write-Host "  Create it from env-example.txt" -ForegroundColor Yellow
}

# Check CORS settings
if (Test-Path $apiEnvPath) {
    $envContent = Get-Content $apiEnvPath -Raw
    if ($envContent -match 'CORS_ALLOWLIST') {
        Write-Host "Success: CORS_ALLOWLIST is configured" -ForegroundColor Green
    }
    else {
        Write-Host "Warning: CORS_ALLOWLIST not found in apps/api/.env" -ForegroundColor Yellow
        Write-Host "  Consider adding your frontend URL" -ForegroundColor Yellow
    }
}

# Check web app API URL
$webEnvPath = "apps\web\.env"
if (Test-Path $webEnvPath) {
    $envContent = Get-Content $webEnvPath -Raw
    if ($envContent -match 'VITE_API_URL\s*=\s*(.+)') {
        $apiUrlValue = $matches[1].Trim().Trim('"').Trim("'")
        Write-Host "Success: VITE_API_URL is set to: $apiUrlValue" -ForegroundColor Green
    }
    else {
        Write-Host "Warning: VITE_API_URL not found in apps/web/.env" -ForegroundColor Yellow
        Write-Host "  Frontend will use default API URL" -ForegroundColor Yellow
    }
}
else {
    Write-Host "Warning: apps/web/.env file not found" -ForegroundColor Yellow
}
Write-Host ""

# Test 3: Test upload sign endpoint
Write-Host "Test 3: Upload Sign Endpoint" -ForegroundColor Yellow
Write-Host "-----------------------------" -ForegroundColor Yellow

$body = @{
    filename = "test.jpg"
    contentType = "image/jpeg"
    size = 1024
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$ApiUrl/api/uploads/sign" `
        -Method Post `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 5 `
        -ErrorAction Stop
    
    if ($response.success -eq $false) {
        if ($response.error -match "unauthorized") {
            Write-Host "Warning: Endpoint requires authentication (expected)" -ForegroundColor Yellow
            Write-Host "  This is normal - uploads require login" -ForegroundColor Yellow
        }
        elseif ($response.error -match "storage not configured") {
            Write-Host "Error: BLOB_READ_WRITE_TOKEN not configured on server" -ForegroundColor Red
            Write-Host "  Set BLOB_READ_WRITE_TOKEN in apps/api/.env and restart server" -ForegroundColor Red
        }
        else {
            Write-Host "Warning: Error: $($response.error)" -ForegroundColor Yellow
        }
    }
    elseif ($response.success -eq $true) {
        Write-Host "Success: Upload sign endpoint is working" -ForegroundColor Green
    }
}
catch {
    $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json -ErrorAction SilentlyContinue
    if ($errorResponse -and $errorResponse.error) {
        if ($errorResponse.error -match "Unauthorized") {
            Write-Host "Warning: Endpoint requires authentication (expected)" -ForegroundColor Yellow
            Write-Host "  This is normal - uploads require login" -ForegroundColor Yellow
        }
        else {
            Write-Host "Warning: Error: $($errorResponse.error)" -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "Error: Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
Write-Host ""

# Test 4: Check Vercel Blob token format
Write-Host "Test 4: Vercel Blob Token Format" -ForegroundColor Yellow
Write-Host "---------------------------------" -ForegroundColor Yellow
if (Test-Path $apiEnvPath) {
    $envContent = Get-Content $apiEnvPath -Raw
    if ($envContent -match 'BLOB_READ_WRITE_TOKEN\s*=\s*(.+)') {
        $tokenValue = $matches[1].Trim().Trim('"').Trim("'")
        if ($tokenValue -and $tokenValue -ne "" -and $tokenValue -ne "vercel_blob_rw_...") {
            if ($tokenValue -match "^vercel_blob_rw_") {
                Write-Host "Success: Token format appears valid" -ForegroundColor Green
            }
            else {
                Write-Host "Error: Token format looks invalid" -ForegroundColor Red
                Write-Host "  Should start with: vercel_blob_rw_" -ForegroundColor Red
            }
        }
        else {
            Write-Host "Warning: No valid token to test" -ForegroundColor Yellow
        }
    }
}
else {
    Write-Host "Warning: Cannot test - .env file not found" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "Summary and Next Steps" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan
Write-Host ""
Write-Host "To fix upload issues:" -ForegroundColor White
Write-Host ""
Write-Host "1. Get Vercel Blob token:" -ForegroundColor White
Write-Host "   - Visit: https://vercel.com/dashboard/stores" -ForegroundColor Gray
Write-Host "   - Create a Blob store or use existing one" -ForegroundColor Gray
Write-Host "   - Copy the Read/Write Token" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Configure API server:" -ForegroundColor White
Write-Host "   - Add to apps/api/.env:" -ForegroundColor Gray
Write-Host "     BLOB_READ_WRITE_TOKEN=`"vercel_blob_rw_...`"" -ForegroundColor Gray
Write-Host "   - Restart API server: cd apps/api; pnpm dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Configure web app (optional):" -ForegroundColor White
Write-Host "   - Add to apps/web/.env:" -ForegroundColor Gray
Write-Host "     VITE_API_URL=`"http://localhost:3001`"" -ForegroundColor Gray
Write-Host "   - Restart web server: cd apps/web; pnpm dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Test in browser:" -ForegroundColor White
Write-Host "   - Log in to the application" -ForegroundColor Gray
Write-Host "   - Try uploading an image" -ForegroundColor Gray
Write-Host "   - Check browser console for errors" -ForegroundColor Gray
Write-Host ""
Write-Host "For more help, see: UPLOAD_DEBUG_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

