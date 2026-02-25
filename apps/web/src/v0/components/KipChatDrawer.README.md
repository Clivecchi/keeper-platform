# KipChatDrawer

## 📌 Purpose
Chat panel opened by the Kip button. Provides chat with Kip agent (when on agent frame) and a Debug button for diagnostics (double load, cover image, etc.). Displays Version v0.1.

## 🧱 Key Files
- `KipChatDrawer.tsx` - Drawer component, context, and debug diagnostics

## 🔄 Data & Behavior
- **KipChatDrawerProvider**: Wraps V0ShellPage; provides open/close/toggle state
- **Kip button** (Margin): Opens drawer when navigating to agent; toggles when already on agent frame
- **Debug button**: Runs `runDebugDiagnostics()` - collects navigation, auth, domain/cover image, API config
- **Version**: Shows "Version v0.1" in header

## ⚠️ Notes & ToDo
- [ ] Verify debug logs help diagnose double load and missing cover image in production

## 📆 Update Log
### 2026-02-24 - Initial
- Added KipChatDrawer with Debug button and Version v0.1
- Kip button opens/toggles chat drawer
