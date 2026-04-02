# V0 Styles System

## 📌 Purpose
Manages the appearance (Style) and atmosphere (Tone) of V0 frames. Provides CSS custom properties for theming components consistently.

## 🧱 Key Files
- `styles.ts` - Legacy style definitions (being phased out)
- `styleRegistry.ts` - New comprehensive style registry with full token spec
- `StyleScope.tsx` - React component that applies style variables to its children
- `StyleOverrideProvider.tsx` - Context provider for live token editing

## 🔄 Lens/Style/Tone Model
- **Lens** = selection/meaning layer (future - not implemented)
- **Style** = appearance layer (current - how things look)
- **Tone** = attribute of Style (current - mood/atmosphere)

## 🎨 Token Specification
Styles use a comprehensive token system covering:
- **Surface**: page, paper, panel, elevated colors
- **Ink**: primary, secondary, tertiary, placeholder text colors
- **Lines**: hairline, ruled line colors
- **Borders**: soft, strong border colors
- **Effects**: shadow, focus ring, hover/press surface colors
- **Layout**: sheet radius, frame/sheet padding

## 📆 Update Log
- 2026-04-01: `StyleScope` accepts optional `className` (merged with `v0-style-scope`) so board shells can apply `flex flex-1 flex-col min-h-0` without an extra wrapper.

## ⚠️ Notes & ToDo
- Lens-driven behavior is not yet implemented
- Styles are applied via CSS custom properties (--theme-*) for consistency with platform ThemeProvider
- Each Style has an associated Tone for categorization
- Style Editor at `/v0/style` provides live token editing for rapid iteration