# How to Install Node.js on Windows

## Quick Steps

### Step 1: Download Node.js
1. Open your web browser
2. Go to: **https://nodejs.org/**
3. You'll see two download buttons:
   - **LTS** (Long Term Support) - Recommended ✅
   - **Current** (Latest features)
4. Click the **LTS** button (this will download the Windows installer)

### Step 2: Run the Installer
1. Open the downloaded file (usually in your Downloads folder)
   - File name will be something like: `node-v20.x.x-x64.msi`
2. The installer will open
3. Click **Next** through the setup wizard
4. **IMPORTANT**: On the "Custom Setup" screen, make sure **"Add to PATH"** is checked ✅
   - This is usually checked by default, but verify it
5. Click **Next** and then **Install**
6. You may need to allow administrator permissions
7. Wait for installation to complete (~2-3 minutes)
8. Click **Finish**

### Step 3: Verify Installation
1. **Close any open PowerShell/Command Prompt windows**
2. **Open a NEW PowerShell window**
3. Run these commands:

```powershell
node --version
```

You should see something like: `v20.x.x` or `v22.x.x`

```powershell
npm --version
```

You should see something like: `10.x.x`

If both commands work, Node.js is installed correctly! ✅

## Alternative: Using Chocolatey (if you have it)

If you have Chocolatey package manager installed:

```powershell
choco install nodejs-lts
```

## Troubleshooting

### "node is not recognized"
- **Solution**: Restart PowerShell/Command Prompt
- If still not working, restart your computer
- Check PATH: `$env:Path -split ';' | Select-String node`

### Installation failed
- Make sure you have administrator rights
- Try downloading the installer again
- Check Windows Defender isn't blocking it

### Wrong version installed
- The LTS version should be 20.x or 22.x
- If you need a specific version, visit: https://nodejs.org/dist/
- Download the specific version installer

## What Gets Installed

- **Node.js** - JavaScript runtime
- **npm** - Node Package Manager (comes with Node.js)
- Both are added to your system PATH

## After Installation

Once Node.js is installed, you can proceed with:

1. Install pnpm:
   ```powershell
   npm install -g pnpm@10.11.0
   ```

2. Install project dependencies:
   ```powershell
   cd "K:\Keeper Codebase\keeper-platform"
   pnpm install
   ```

## Need Help?

If you encounter any issues:
- Check the Node.js website: https://nodejs.org/
- Node.js documentation: https://nodejs.org/docs/
- Common issues: https://github.com/nodejs/help






