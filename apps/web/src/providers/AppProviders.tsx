/**
 * AppProviders - Global Provider Wrapper
 * 
 * Extracts all global providers from main.tsx into a reusable component.
 * This ensures consistent provider hierarchy across all layouts.
 * 
 * Providers (in order):
 * - AuthGate: Validates session before rendering
 * - BrowserRouter: React Router for navigation
 * - AuthProvider: Authentication state and user context
 * - ThemeProvider: Theme switching (light/dark)
 * - ViewModeProvider: View mode state
 * - KeeperProvider: Keeper-specific context
 * - FrameProvider: Frame system context
 * - BoardProvider: Board-specific context
 * 
 * Shell UI (Navbar, Sidebar, Footer) is NOT included here.
 * Layout components handle shell UI separately.
 */

import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthGate } from '../auth/AuthGate';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ViewModeProvider } from '../context/ViewModeContext';
import { FrameProvider } from '../context/FrameContext';
import { KeeperProvider } from '../context/KeeperContext';
import { BoardProvider } from '../context/BoardContext';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <React.StrictMode>
      <AuthGate>
        <BrowserRouter>
          <AuthProvider>
            <ThemeProvider>
              <ViewModeProvider>
                <KeeperProvider>
                  <FrameProvider>
                    <BoardProvider>
                      {children}
                    </BoardProvider>
                  </FrameProvider>
                </KeeperProvider>
              </ViewModeProvider>
            </ThemeProvider>
          </AuthProvider>
        </BrowserRouter>
      </AuthGate>
    </React.StrictMode>
  );
};

