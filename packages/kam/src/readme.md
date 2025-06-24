/**
 * KAM (Keeper Account Manager)
 * --------------------------------------
 * This module manages authentication, session logic, API key access, and user configuration.
 * It acts as the identity gateway for the entire platform.
 * 
 * Folder structure:
 * - auth: core login/signup/logout/session logic
 * - api: endpoint routes
 * - hooks: auth-related client-side hooks
 * - settings: user preferences like theme
 * - types: shared auth types across system
 * 
 * Cursor Rule: ALWAYS follow the folder-level README files for further instructions.
 */

 Keeper Account Manager (KAM) README

🧠 Purpose

KAM (Keeper Account Manager) is the centralized system responsible for managing all user-related functionality, including authentication, onboarding, session handling, user preferences, and public user profiles.

This folder acts as the canonical source for everything related to identity, access, and preference management across the Keeper platform.

🧩 Responsibilities

KAM handles:

Authentication: Sign-up, Sign-in, Sign-out, and Password Reset

Authorization: Token/session verification for secure access to platform routes

User Management: Creation, lookup, and update of PublicUser and User records

User Settings: Theme preferences, avatar, display name, and system respect logic

Initial Theming: Automatically assigns Keeper Classic theme upon user signup

Onboarding (Technical): Executes post-signup logic like default record creation and configuration. (Note: This does not include UI-based platform tutorials or product tours.)

API Integration: Provides auth-guarded API routes for frontend consumption

🗂 Suggested Folder Structure

/kam
├── README.md             # This file (living architecture doc for KAM)
├── auth/                 # Auth UI routes (sign-in, sign-up, etc.)
│   ├── sign-in.tsx
│   ├── sign-up.tsx
│   └── zod-auth-schema.ts
├── hooks/                # React session hooks
│   └── useSession.ts
├── api/                  # Backend auth routes
│   ├── login.ts
│   ├── logout.ts
│   └── user-settings.ts
├── lib/                  # Core logic (e.g., hashing, user lookup)
│   ├── getUser.ts
│   └── hashPassword.ts
├── types/                # Type definitions
│   └── user.ts
└── settings/             # Preference management
    ├── theme-preference.ts
    └── profile-info.ts

This section summarizes schema entities that are most relevant to the /kam domain:

id: String @id @default(cuid())
email: String? @unique
emailVerified: DateTime?
hashedPassword: String?
name: String?
avatar_url: String?
createdAt: DateTime @default(now())
updatedAt: DateTime @updatedAt

Relations:

userSettings: UserSettings? — contains theme info

🧩 Related Model: UserSettings

userId: String @uniqu
preferred_theme_id: String?
themeMode: String?
respectSystemTheme: Boolean @default(true)

UserSettings: userId, preferred_theme_id, themeMode, respectSystemTheme

Theme: id, slug, default_mode, palette, style

Reference /prisma/README.md for the full schema map and cross-references.

🧱 Key Architectural Rules

Strict typing: All user logic must use Zod validation schemas and TypeScript types

No hardcoded themes: Always respect database-configured UserSettings

Theme fallback: On first sign-up, fallback to Keeper Classic theme

Single source of truth: All user data must flow through KAM endpoints or hooks

Scoped API routes: Use /api/kam/* routes for backend access control

Avoid logic duplication: Share validation and database accessors across files

Use pnpm for all package management: Never mix with npm or yarn

Use npx only for one-time CLI utilities like prisma or tailwindcss init


🔄 Change Log Expectations

Cursor will be instructed to update this README whenever meaningful changes are made within the /kam folder. This includes:

New routes or UI screens

Schema or database logic changes

Naming convention updates

Authentication flow adjustments

A versioned snapshot of this README will be preserved elsewhere to track evolution.

🛠 Work In Progress



✍️ Authorship

This README and the KAM architecture are authored by platform engineering leadership in partnership with Kip. The goal is to create an elegant, scalable, and trustworthy user management experience across the Keeper platform.