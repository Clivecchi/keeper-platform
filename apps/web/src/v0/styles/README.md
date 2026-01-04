# V0 Styles System

## 📌 Purpose
Manages the appearance (Style) and atmosphere (Tone) of V0 frames. Provides CSS custom properties for theming components consistently.

## 🧱 Key Files
- `styles.ts` - Style definitions, Tone types, and utility functions
- `StyleScope.tsx` - React component that applies style variables to its children

## 🔄 Lens/Style/Tone Model
- **Lens** = selection/meaning layer (future - not implemented)
- **Style** = appearance layer (current - how things look)
- **Tone** = attribute of Style (current - mood/atmosphere)

## ⚠️ Notes & ToDo
- Lens-driven behavior is not yet implemented
- Styles are applied via CSS custom properties (--v0-*)
- Each Style has an associated Tone for categorization