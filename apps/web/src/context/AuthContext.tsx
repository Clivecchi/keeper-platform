import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { setAuthToken, getAuthToken, clearAuthToken } from '../lib/authTokenStore';
import { getApiBase } from '../lib/apiFetch';

// Frontend types (no need to import backend types)
interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  /** Platform roles from DB (e.g. super-admin). Source of truth for isAdmin. */
  platformRoles?: string[];
}

interface AuthSuccessData {
  user: AuthUser;
  token?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authResolved: boolean;
  login: (data: AuthSuccessData) => void;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  /** Refresh session from server (e.g. after 401). Returns true if session is valid. */
  refreshSession: () => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Shared promise for initial auth fetch — dedupes duplicate calls from React StrictMode double-mount */
let initialAuthFetchPromise: Promise<boolean> | null = null;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const [authResolved, setAuthResolved] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const resolveIsAdmin = React.useCallback((nextUser: AuthUser | null) => {
    if (!nextUser) return false;
    // Source of truth: DB roles from /api/kam/auth/me and login/register responses
    if (nextUser.platformRoles?.includes('super-admin')) return true;
    // Fallback during migration: env allowlist (deprecated, remove once DB roles verified)
    const rawAllowlist = String((import.meta as any)?.env?.VITE_ADMIN_EMAIL_ALLOWLIST || '');
    const allowlist = rawAllowlist
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    return !!nextUser.email && allowlist.includes(nextUser.email.toLowerCase());
  }, []);

  // Fetch user session from server
  const fetchUserSession = React.useCallback(async () => {
    if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') {
      console.log('[AuthContext] Fetching user session from server...');
    }

    try {
      const apiBase = getApiBase();
      const authMeUrl = apiBase ? `${apiBase}/api/kam/auth/me` : '/api/kam/auth/me';

      // Build headers: always send stored JWT as Authorization if available.
      // This is the primary auth mechanism; cookies are a bonus when they work.
      const headers: Record<string, string> = {};
      const storedJwt = getAuthToken();
      if (storedJwt) {
        headers['Authorization'] = `Bearer ${storedJwt}`;
      }

      const response = await fetch(authMeUrl, {
        method: 'GET',
        credentials: 'include', // Also send HttpOnly cookie if present
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') {
            console.log('[AuthContext] ✅ User authenticated:', data.user.email);
          }
          setUser(data.user);
          setToken(storedJwt || 'cookie-based');
          setIsAdmin(resolveIsAdmin(data.user));
          setLastFetch(Date.now());
          return true;
        }
      } else {
        // 401 is expected for logged-out visitors; only log when debugging
        if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') {
          console.log('[AuthContext] No valid session (status:', response.status, ')');
        }
        // If both cookie and stored token failed, clear stale token
        clearAuthToken();
        setUser(null);
        setToken(null);
        setIsAdmin(false);
      }
    } catch (error) {
      // 401 is expected for guests; only log actual failures (network, etc.)
      const status = (error as any)?.response?.status ?? (error as any)?.status;
      if (status !== 401) {
        console.error('[AuthContext] Failed to fetch user session:', error);
      }
      setUser(null);
      setToken(null);
      setIsAdmin(false);
    }

    // Development fallback: check localStorage
    if (!import.meta.env.PROD) {
      try {
        const lsToken = localStorage.getItem('keeper_token');
        const lsUser = localStorage.getItem('keeper_user');
        if (lsToken && lsUser) {
          console.log('[AuthContext] Dev mode: loaded auth from localStorage');
          const parsedUser = JSON.parse(lsUser) as AuthUser;
          setAuthToken(lsToken);
          setToken(lsToken);
          setUser(parsedUser);
          setIsAdmin(resolveIsAdmin(parsedUser));
          return true;
        }
      } catch (error) {
        console.error('[AuthContext] Failed to parse auth data from localStorage', error);
        localStorage.removeItem('keeper_token');
        localStorage.removeItem('keeper_user');
      }
    }

    return false;
  }, [resolveIsAdmin]);

  // Initial load — single /api/kam/auth/me call (deduped for StrictMode double-mount)
  useEffect(() => {
    if (!initialAuthFetchPromise) {
      initialAuthFetchPromise = fetchUserSession();
    }
    initialAuthFetchPromise.finally(() => {
      setAuthResolved(true);
      setIsLoading(false);
    });
  }, [fetchUserSession]);

  // Removed periodic refresh - was causing page loops and annoying refreshes

  const login = (data: AuthSuccessData) => {
    if (data.user) {
      setUser(data.user);

      // Always store the JWT token for reliable auth.
      // The server also sets an HttpOnly cookie, but token-based auth
      // is the reliable primary mechanism that works everywhere.
      if (data.token) {
        setAuthToken(data.token);
        setToken(data.token);
        console.log('[AuthContext] Auth token stored for session');
      } else {
        setToken('cookie-based');
      }

      // Dev: also persist to localStorage for dev tools convenience
      if (!import.meta.env.PROD && data.token) {
        localStorage.setItem('keeper_user', JSON.stringify(data.user));
        localStorage.setItem('keeper_token', data.token);
      }

      setIsAdmin(resolveIsAdmin(data.user));
      setAuthResolved(true);
      setIsLoading(false);
    }
  };

  const logout = () => {
    clearAuthToken();
    setUser(null);
    setToken(null);
    setIsAdmin(false);
    setAuthResolved(true);
    setIsLoading(false);
    localStorage.removeItem('keeper_user');
    localStorage.removeItem('keeper_token');
  };

  const updateUser = (userData: Partial<AuthUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('keeper_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isAdmin, authResolved, login, logout, updateUser, refreshSession: fetchUserSession, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 