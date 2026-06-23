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
 * - WorldModeProvider: World mode (Presentation vs Workshop)
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
import { WorldModeProvider } from '../context/WorldModeContext';
import { FrameProvider } from '../context/FrameContext';
import { KeeperProvider } from '../context/KeeperContext';
import { BoardProvider } from '../context/BoardContext';
import { TheatreStudioLoader } from '../v0/presents/theatre/TheatreStudioLoader';
import { PwaProvider } from '../mobile/pwa';

interface AppProvidersProps {
  children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <React.StrictMode>
      <TheatreStudioLoader />
      <BrowserRouter>
        <AuthProvider>
          <AuthGate>
            <ThemeProvider>
              <ViewModeProvider>
                <WorldModeProvider>
                  <KeeperProvider>
                    <FrameProvider>
                      <BoardProvider>
                        <PwaProvider>
                          {children}
                        </PwaProvider>
                      </BoardProvider>
                    </FrameProvider>
                  </KeeperProvider>
                </WorldModeProvider>
              </ViewModeProvider>
            </ThemeProvider>
          </AuthGate>
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
};

