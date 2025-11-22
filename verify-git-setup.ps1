# Git Setup Verification Script
# Run this script to diagnose and fix Git PATH issues

Write-Host "=== Git Setup Verification ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Try to find Git
Write-Host "Step 1: Looking for Git installation..." -ForegroundColor Yellow

$gitPaths = @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe",
    "$env:LOCALAPPDATA\GitHubDesktop\*\resources\app\git\cmd\git.exe"
)

$foundGit = $null
foreach ($path in $gitPaths) {
    $resolved = Resolve-Path $path -ErrorAction SilentlyContinue
    if ($resolved) {
        $foundGit = $resolved[0].Path
        Write-Host "  ✓ Found Git at: $foundGit" -ForegroundColor Green
        break
    }
}

if (-not $foundGit) {
    Write-Host "  ✗ Git not found in common locations" -ForegroundColor Red
    Write-Host "  Please check GitHub Desktop installation" -ForegroundColor Yellow
    exit 1
}

# Step 2: Add to PATH for this session
Write-Host ""
Write-Host "Step 2: Adding Git to PATH for this session..." -ForegroundColor Yellow

$gitDir = Split-Path $foundGit -Parent
if ($env:Path -notlike "*$gitDir*") {
    $env:Path += ";$gitDir"
    Write-Host "  ✓ Added to PATH: $gitDir" -ForegroundColor Green
} else {
    Write-Host "  ✓ Git already in PATH" -ForegroundColor Green
}

# Step 3: Verify Git works
Write-Host ""
Write-Host "Step 3: Testing Git..." -ForegroundColor Yellow

try {
    $gitVersion = git --version 2>&1
    Write-Host "  ✓ $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Git command failed: $_" -ForegroundColor Red
    exit 1
}

# Step 4: Check repository
Write-Host ""
Write-Host "Step 4: Checking repository connection..." -ForegroundColor Yellow

$repoPath = "C:\Users\clive\OneDrive\Documents\GitHub\keeper-platform"
if (-not (Test-Path $repoPath)) {
    Write-Host "  ✗ Repository path not found: $repoPath" -ForegroundColor Red
    Write-Host "  Please update the path in this script" -ForegroundColor Yellow
    exit 1
}

Set-Location $repoPath

# Check if it's a git repository
if (-not (Test-Path ".git")) {
    Write-Host "  ✗ Not a git repository (no .git folder found)" -ForegroundColor Red
    Write-Host "  You may need to clone the repository or initialize it" -ForegroundColor Yellow
    exit 1
}

Write-Host "  ✓ Repository found at: $repoPath" -ForegroundColor Green

# Check remote
Write-Host ""
Write-Host "Step 5: Checking remote connection..." -ForegroundColor Yellow

try {
    $remotes = git remote -v 2>&1
    if ($remotes) {
        Write-Host "  ✓ Remote configured:" -ForegroundColor Green
        $remotes | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } else {
        Write-Host "  ⚠ No remote configured" -ForegroundColor Yellow
        Write-Host "    You may need to add a remote: git remote add origin <url>" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Error checking remotes: $_" -ForegroundColor Red
}

# Check status
Write-Host ""
Write-Host "Step 6: Checking repository status..." -ForegroundColor Yellow

try {
    $status = git status --short 2>&1
    $branch = git branch --show-current 2>&1
    
    Write-Host "  ✓ Current branch: $branch" -ForegroundColor Green
    
    if ($status) {
        Write-Host "  ⚠ Uncommitted changes detected:" -ForegroundColor Yellow
        $status | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } else {
        Write-Host "  ✓ Working directory clean" -ForegroundColor Green
    }
} catch {
    Write-Host "  ✗ Error checking status: $_" -ForegroundColor Red
}

# Check recent commits
Write-Host ""
Write-Host "Step 7: Checking recent commits..." -ForegroundColor Yellow

try {
    $commits = git log --oneline -5 2>&1
    if ($commits) {
        Write-Host "  ✓ Recent commits:" -ForegroundColor Green
        $commits | ForEach-Object { Write-Host "    $_" -ForegroundColor Gray }
    } else {
        Write-Host "  ⚠ No commits found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ✗ Error checking commits: $_" -ForegroundColor Red
}

# Summary
Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Git is working in this PowerShell session." -ForegroundColor Green
Write-Host ""
Write-Host "To make this permanent, add this to your system PATH:" -ForegroundColor Yellow
Write-Host "  $gitDir" -ForegroundColor White
Write-Host ""
Write-Host "Or run this script each time you open PowerShell." -ForegroundColor Yellow

