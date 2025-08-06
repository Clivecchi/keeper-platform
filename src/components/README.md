# Components

## 📌 Purpose
This folder contains all React components for the Keeper Platform UI.

## 🧱 Key Files
- `DebugInfo.tsx` - Debug component for troubleshooting styling issues
- `AuthForm.tsx` - Authentication form component
- `layout/Navbar.tsx` - Main navigation component
- `boards/` - Board rendering components
- `NavigationMenu/` - Navigation menu component
- `ThemeProvider/` - Theme management component

## 🔄 Data & Behavior
Components use the AuthContext and ThemeContext for state management. The DebugInfo component helps troubleshoot styling issues by displaying CSS custom properties and testing Tailwind classes.

## ⚠️ Notes & ToDo
- [x] Fixed Tailwind CSS v4 to v3 downgrade
- [x] Added fallback CSS variables for theme system
- [x] Created DebugInfo component for troubleshooting
- [x] Fixed PostCSS configuration
- [ ] Verify all components render correctly after theme fixes
- [ ] Test authentication flow
- [ ] Confirm navigation works properly

## 📆 Update Log
### 2024-12-19
- **FIX**: Downgraded Tailwind CSS from v4 to v3 for stability
- **ADD**: Created DebugInfo component for troubleshooting styling issues
- **FIX**: Updated PostCSS configuration for Tailwind v3
- **FIX**: Added fallback CSS variables to prevent unstyled content
- **FIX**: Updated theme variable naming to match Tailwind expectations
