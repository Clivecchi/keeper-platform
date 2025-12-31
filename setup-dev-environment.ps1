# Development Environment Setup Script
# This script checks for required tools and installs dependencies

Write-Host "=== Keeper Platform Development Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Node.js
Write-Host "Step 1: Checking Node.js installation..." -ForegroundColor Yellow

$nodeExists = $false
$nodeVersion = ""

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCmd) {
    $result = node --version 2>&1
    if ($result -and $result -match '^v\d+\.') {
        $nodeVersion = $result.ToString().Trim()
        $nodeExists = $true
        Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
        
        # Check if version is 20.x or 22.x
        if ($nodeVersion -match 'v(20|22)\.') {
            Write-Host "  ✓ Node.js version is compatible (20.x or 22.x)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Warning: Node.js version should be 20.x or 22.x (LTS)" -ForegroundColor Yellow
            Write-Host "    Current: $nodeVersion" -ForegroundColor Yellow
        }
    }
}

if (-not $nodeExists) {
    Write-Host "  ✗ Node.js not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Please install Node.js first:" -ForegroundColor Yellow
    Write-Host "  1. Visit: https://nodejs.org/" -ForegroundColor White
    Write-Host "  2. Download the LTS version (v20.x or v22.x)" -ForegroundColor White
    Write-Host "  3. Run the installer and check 'Add to PATH'" -ForegroundColor White
    Write-Host "  4. Restart PowerShell and run this script again" -ForegroundColor White
    Write-Host ""
    $response = Read-Host "  Open Node.js download page now? (Y/n)"
    if ($response -ne 'n' -and $response -ne 'N') {
        Start-Process "https://nodejs.org/"
    }
    exit 1
}

# Step 2: Check pnpm
Write-Host ""
Write-Host "Step 2: Checking pnpm installation..." -ForegroundColor Yellow

$pnpmExists = $false
$pnpmVersion = ""

$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
if ($pnpmCmd) {
    $result = pnpm --version 2>&1
    if ($result -and $result -match '^\d+\.') {
        $pnpmVersion = $result.ToString().Trim()
        $pnpmExists = $true
        Write-Host "  ✓ pnpm found: $pnpmVersion" -ForegroundColor Green
        
        # Check if version matches required (10.11.0)
        if ($pnpmVersion -eq "10.11.0") {
            Write-Host "  ✓ pnpm version is correct (10.11.0)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ pnpm version mismatch. Required: 10.11.0, Found: $pnpmVersion" -ForegroundColor Yellow
            Write-Host "  Installing correct version..." -ForegroundColor Yellow
            npm install -g pnpm@10.11.0
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ pnpm 10.11.0 installed" -ForegroundColor Green
                $pnpmExists = $true
            } else {
                Write-Host "  ✗ Failed to install pnpm" -ForegroundColor Red
                exit 1
            }
        }
    }
}

if (-not $pnpmExists) {
    Write-Host "  ✗ pnpm not found. Installing..." -ForegroundColor Yellow
    npm install -g pnpm@10.11.0
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ pnpm 10.11.0 installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to install pnpm" -ForegroundColor Red
        Write-Host "  Please run manually: npm install -g pnpm@10.11.0" -ForegroundColor Yellow
        exit 1
    }
}

# Step 3: Check if we're in the right directory
Write-Host ""
Write-Host "Step 3: Verifying project location..." -ForegroundColor Yellow

if (-not (Test-Path "package.json")) {
    Write-Host "  ✗ package.json not found" -ForegroundColor Red
    Write-Host "  Please run this script from the project root directory:" -ForegroundColor Yellow
    Write-Host "  K:\Keeper Codebase\keeper-platform" -ForegroundColor White
    exit 1
}

Write-Host "  ✓ Found package.json" -ForegroundColor Green

# Step 4: Check for existing node_modules
Write-Host ""
Write-Host "Step 4: Checking existing dependencies..." -ForegroundColor Yellow

if (Test-Path "node_modules") {
    Write-Host "  ⚠ node_modules directory exists" -ForegroundColor Yellow
    $response = Read-Host "  Do you want to reinstall? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        Write-Host "  Removing existing node_modules..." -ForegroundColor Yellow
        Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
        Write-Host "  ✓ Removed" -ForegroundColor Green
    } else {
        Write-Host "  Using existing installation" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ No existing node_modules (fresh install)" -ForegroundColor Green
}

# Step 5: Install dependencies
Write-Host ""
Write-Host "Step 5: Installing project dependencies..." -ForegroundColor Yellow
Write-Host "  This may take several minutes..." -ForegroundColor Gray

pnpm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ✗ Installation failed" -ForegroundColor Red
    Write-Host "  Exit code: $LASTEXITCODE" -ForegroundColor Red
    Write-Host "  Try running manually: pnpm install" -ForegroundColor Yellow
    exit 1
}

Write-Host "  ✓ Dependencies installed successfully" -ForegroundColor Green

# Step 6: Verify installation
Write-Host ""
Write-Host "Step 6: Verifying installation..." -ForegroundColor Yellow

$keyPackages = @(
    "node_modules/react",
    "node_modules/express",
    "node_modules/@prisma/client",
    "node_modules/typescript"
)

$allFound = $true
foreach ($pkg in $keyPackages) {
    if (Test-Path $pkg) {
        Write-Host "  ✓ $(Split-Path $pkg -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $(Split-Path $pkg -Leaf) not found" -ForegroundColor Red
        $allFound = $false
    }
}

if (-not $allFound) {
    Write-Host ""
    Write-Host "  ⚠ Some packages are missing. Try running: pnpm install" -ForegroundColor Yellow
}

# Step 7: Generate Prisma client
Write-Host ""
Write-Host "Step 7: Generating Prisma client..." -ForegroundColor Yellow

pnpm db:generate 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Prisma client generated" -ForegroundColor Green
} else {
    Write-Host "  ⚠ Prisma generation had issues (may need DATABASE_URL)" -ForegroundColor Yellow
    Write-Host "    This is normal if database is not configured yet" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Copy .env.example to .env (if it exists)" -ForegroundColor White
Write-Host "2. Configure environment variables (DATABASE_URL, JWT_SECRET, etc.)" -ForegroundColor White
Write-Host "3. Run 'pnpm dev' to start development servers" -ForegroundColor White
Write-Host ""
Write-Host "Common commands:" -ForegroundColor Yellow
Write-Host "  pnpm dev          - Start development servers" -ForegroundColor White
Write-Host "  pnpm build          - Build all packages" -ForegroundColor White
Write-Host "  pnpm type-check   - Run TypeScript type checking" -ForegroundColor White
Write-Host "  pnpm lint         - Run linter" -ForegroundColor White
Write-Host ""
