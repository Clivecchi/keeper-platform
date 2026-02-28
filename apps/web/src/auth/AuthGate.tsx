// src/auth/AuthGate.tsx
// Waits for AuthContext to resolve session before rendering app.
// Uses AuthProvider as single source of truth — no duplicate /api/kam/auth/me calls.
// Prevents "phantom login" by ensuring auth state is resolved before any route renders.

import React from 'react';
import { useAuth } from '../context/AuthContext';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { authResolved, isLoading } = useAuth();

  if (!authResolved || isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          fontSize: '18px',
          color: '#64748b',
        }}
      >
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
