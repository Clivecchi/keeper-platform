# How to Add Node.js and pnpm to System PATH

## Correct Steps

When you're in **Environment Variables → System variables → Path → Edit**, you're editing the **existing PATH variable**, not creating a new one.

### Step-by-Step Instructions

1. **Press `Win + X`** → Select **"System"**

2. Click **"Advanced system settings"** (on the left or in the list)

3. Click **"Environment Variables"** button (at the bottom)

4. In the **"System variables"** section (bottom half), find and select **"Path"**

5. Click **"Edit"** button

6. **Important**: You'll see a list of existing paths. You need to **add new entries** to this list:
   - Click **"New"** button
   - Paste: `C:\Program Files\nodejs`
   - Click **"New"** button again
   - Paste: `C:\Users\clive\AppData\Roaming\npm`

7. Click **"OK"** on all dialogs

8. **Restart PowerShell** (close and reopen) for changes to take effect

## Visual Guide

When you click "Edit" on the Path variable, you should see:
- A list of existing paths (like `C:\Windows\System32`, etc.)
- **"New"** button at the top
- **"Edit"** button (to edit existing entries)
- **"Delete"** button (to remove entries)
- **"Move Up"** and **"Move Down"** buttons

You're adding two **new entries** to this existing list, not creating a new variable.

## Alternative: Using PowerShell (Run as Administrator)

If you prefer, you can also do this via PowerShell (run PowerShell as Administrator):

```powershell
# Get current PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")

# Add new paths if they don't exist
$pathsToAdd = @(
    "C:\Program Files\nodejs",
    "C:\Users\clive\AppData\Roaming\npm"
)

foreach ($path in $pathsToAdd) {
    if ($currentPath -notlike "*$path*") {
        $currentPath += ";$path"
    }
}

# Set the new PATH
[Environment]::SetEnvironmentVariable("Path", $currentPath, "Machine")
```

Then restart PowerShell.

## Verify It Worked

After restarting PowerShell, run:

```powershell
node --version
npm --version
pnpm --version
```

All three should work without needing to add to PATH manually.











