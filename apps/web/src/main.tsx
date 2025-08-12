import React from 'react';
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ViewModeProvider } from './context/ViewModeContext'
import { FrameProvider } from './context/FrameContext'
import { KeeperProvider } from './context/KeeperContext'
import { BoardProvider } from './context/BoardContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <ViewModeProvider>
            <KeeperProvider>
              <FrameProvider>
                <BoardProvider>
                  <App />
                </BoardProvider>
              </FrameProvider>
            </KeeperProvider>
          </ViewModeProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
