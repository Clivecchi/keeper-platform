# Git PATH Setup Instructions

## Problem
Git is installed via GitHub Desktop but not available in PowerShell/command line because it's not in your system PATH.

## Solution: Add Git to PATH

### Step 1: Find Git Installation Location

GitHub Desktop typically installs Git in one of these locations:
- `C:\Program Files\Git\cmd\`
- `C:\Users\<YourUsername>\AppData\Local\GitHubDesktop\app-<version>\resources\app\git\cmd\`
- `C:\Program Files (x86)\Git\cmd\`

### Step 2: Add Git to PATH (Temporary - Current Session Only)

Open PowerShell and run:
```powershell
$env:Path += ";C:\Program Files\Git\cmd"
```

If that doesn't work, try:
```powershell
$env:Path += ";C:\Users\$env:USERNAME\AppData\Local\GitHubDesktop\app-*\resources\app\git\cmd"
```

### Step 3: Verify Git Works

```powershell
git --version
```

### Step 4: Check Repository Status

Once Git is working, verify your repository connection:

```powershell
# Check current status
git status

# Check remote connection
git remote -v

# Check current branch
git branch

# Check recent commits
git log --oneline -5
```

## Permanent Solution: Add Git to System PATH

### Option A: Via System Settings (Recommended)

1. Press `Win + X` and select "System"
2. Click "Advanced system settings"
3. Click "Environment Variables"
4. Under "System variables", find and select "Path", then click "Edit"
5. Click "New" and add: `C:\Program Files\Git\cmd`
6. Click "OK" on all dialogs
7. **Restart PowerShell** for changes to take effect

### Option B: Via PowerShell (Run as Administrator)

```powershell
# Run PowerShell as Administrator, then:
[Environment]::SetEnvironmentVariable(
    "Path",
    [Environment]::GetEnvironmentVariable("Path", "Machine") + ";C:\Program Files\Git\cmd",
    "Machine"
)
```

Then restart PowerShell.

## Quick Test Script

After adding to PATH, run this to verify everything:

```powershell
# Test Git
git --version

# Check repository status
cd "K:\Keeper Codebase\keeper-platform"
git status

# Check remote connection
git remote -v

# Check if you're on the right branch
git branch -a
```

## Expected Results

- `git --version` should show: `git version 2.x.x`
- `git remote -v` should show your GitHub repository URL (something like `https://github.com/username/repo.git`)
- `git status` should show your current branch and any uncommitted changes

## If GitHub Desktop Shows Different State

If GitHub Desktop shows commits/changes that don't appear in command line:
1. Make sure you're in the correct directory: `K:\Keeper Codebase\keeper-platform`
2. The repository might be in a different location - check where GitHub Desktop cloned it
3. In GitHub Desktop, go to Repository → Show in Explorer to find the exact path

