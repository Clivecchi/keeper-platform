## Settings Module (`/kam/settings`)

This module is responsible for managing user-specific system preferences, primarily dealing with the `UserSettings` data model. It allows users to customize their experience on the Keeper platform.

### Core Responsibilities:
- Managing theme preferences, including `preferred_theme_id` and `themeMode`.
- Handling settings related to system theme respect (`respectSystemTheme`).
- Potentially managing other user-configurable settings like onboarding flags, notification preferences, etc.

### Associated Prisma Model: `UserSettings`
Key fields include:
- `id`: Unique identifier for the settings record.
- `userId`: Foreign key linking to the `User` model.
- `preferred_theme_id`: Stores the ID of the user's chosen theme. This is a required string in the database and has a schema-defined default value. If not provided during initial settings creation, the default is used.
- `themeMode`: Indicates the theme mode (e.g., 'light', 'dark', 'system') (optional).
- `respectSystemTheme`: Boolean indicating if the platform should respect the OS-level theme settings (defaults to true).

### Key Files:
- `index.ts`: Exports logic for retrieving and updating user settings.
- `types.ts`: Defines types specific to settings management, such as input types for updates or structured settings objects.
- `updateSettings.ts`: Implements `updateUserSettingsHandler` for modifying user preferences.

Cursor Rule: Use Prisma-generated types when handling `UserSettings` logic, especially `themeMode`. 