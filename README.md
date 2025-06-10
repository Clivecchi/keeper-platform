# Keeper Platform

A poetic digital space where people preserve what matters. This is the beginning of a life-centered UI.

## 🚀 Getting Started

This project contains a **React frontend** (for Vercel) and an **Express backend** (for Railway).

- **Frontend**: `React` `Vite` `TypeScript` `TailwindCSS` `Shadcn` `Framer Motion`
- **Backend**: `Express.js` `Prisma` `Zod` `PostgreSQL`

### Running Locally

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```
2.  **Run the development server:**
    ```bash
    pnpm dev
    ```

---

## 🏛️ Architecture Overview

### UI Shell
The UI is built around a central `AppLayout.tsx` which provides a consistent structure and includes the main `Navbar.tsx`. The entire application is wrapped in two key context providers:

- **`AuthProvider`**: Manages user authentication state.
- **`ThemeProvider`**: Manages the application's visual theme, applying styles dynamically using CSS variables. The default theme is "Keeper Classic".

### Key Components & Pages

-   **`LandingPage.tsx`**: The public-facing welcome page, designed to be inviting and poetic.
-   **`LoginPage.tsx` / `RegisterPage.tsx`**: Centered, card-based forms for user authentication.
-   **`RootKeeperPage.tsx`**: The main authenticated view, providing a personal space for the user.

### Routing

Routing is managed by `react-router-dom` in `App.tsx`. Public and protected routes are clearly defined, with `AppLayout` wrapping all views.
---

## 📆 Update Log
### 2024-05-22
- **INIT**: Scaffolding of the initial Keeper UI shell.
- **ADD**: `AppLayout`, `Navbar`, `ThemeProvider`, and pages for Landing, Login, Register, and Root Keeper.
- **STYLE**: Implemented a custom theming system with a "Keeper Classic" default theme.
- **STYLE**: Added custom fonts (`Playfair Display`, `EB Garamond`, `Inter`) and base styles.
- **REFACTOR**: Redesigned authentication pages (`LoginPage`, `RegisterPage`) with a card-based UI.
- **REFACTOR**: Updated routing in `App.tsx` to use the new layout and providers.

# Keeper Platform: Source Structure

This project contains both a **React frontend** (for Vercel) and an **Express backend** (for Railway). The source code is organized to support dual build targets and deploy paths.

---

## 🔷 Frontend (React + Vite)
- Entry: `src/main.tsx`
- JSX components live in `src/**/*.tsx`
- Built using `vite` and compiled with `tsconfig.app.json`

**Build Commands:**
```bash
pnpm run build        # Runs Vite + tsconfig.app.json
pnpm run dev          # Local dev server for frontend
