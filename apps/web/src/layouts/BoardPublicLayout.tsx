/**
 * BoardPublicLayout - Minimal Layout for Board Routes
 * 
 * This layout is designed for the board-driven interface.
 * It provides NO shell UI (no top nav, no sidebar, no footer).
 * 
 * Used for: /d/:slug (public domain board)
 * 
 * Features:
 * - Full viewport rendering
 * - No navigation chrome
 * - Still benefits from all global providers (auth, theme, etc.)
 * - Board pages handle their own inline auth controls
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

export const BoardPublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
};

