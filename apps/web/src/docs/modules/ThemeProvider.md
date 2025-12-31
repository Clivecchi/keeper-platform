# ThemeProvider

## Purpose
Provides a global context for applying and switching Tailwind-based themes (light/dark), with future support for user-defined themes and database-stored preferences.

## Responsibilities
- Read the user's theme from the database (via Prisma)
- Apply Tailwind `darkMode: 'class'` toggle
- Expose `useTheme()` hook for changing or reading theme
- Integrate with ThemeEditorDialog and Frame system styling

## Database Dependencies
- `User.themeMode` or equivalent
- `Theme` model defining named themes (e.g., Keeper Classic)
- `Palette` structure for theme tokens

## Cursor Integration
Use Notepad: `ThemeProvider Bootstrapping`
- Prompt to scaffold ThemeProvider and ThemeContext
- Should support light/dark toggle
- Placeholder logic for applying custom themes via className or style tokens 