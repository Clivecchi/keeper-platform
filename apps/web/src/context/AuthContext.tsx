import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Frontend types (no need to import backend types)
interface AuthUser {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
}

interface AuthSuccessData {
  user: AuthUser;
  token?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: AuthSuccessData) => void;
  logout: () => void;
  updateUser: (userData: Partial<AuthUser>) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // Fetch user session from server
  const fetchUserSession = React.useCallback(async () => {
    const IS_PROD = import.meta.env.PROD;
    
    if (IS_PROD) {
      // Production: Fetch user data from server (cookie-based auth)
      console.log('[AuthContext] Fetching user session from server...');
      
      try {
        const apiUrl = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
        const response = await fetch(`${apiUrl}/api/kam/auth/me`, {
          method: 'GET',
          credentials: 'include', // Send HttpOnly cookie
        });

        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('[AuthContext] ✅ User authenticated:', data.user.email);
            setUser(data.user);
            setToken('cookie-based');
            setLastFetch(Date.now());
            return true;
          }
        } else {
          console.log('[AuthContext] ❌ No valid session (401)');
          setUser(null);
          setToken(null);
        }
      } catch (error) {
        console.error('[AuthContext] Failed to fetch user session:', error);
        setUser(null);
        setToken(null);
      }
      return false;
    }

    // Development only: read from localStorage for local testing
    try {
      const storedToken = localStorage.getItem('keeper_token');
      const storedUser = localStorage.getItem('keeper_user');
      if (storedToken && storedUser) {
        console.log('[AuthContext] Dev mode: loaded auth from localStorage');
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        return true;
      }
    } catch (error) {
      console.error("[AuthContext] Failed to parse auth data from localStorage", error);
      localStorage.removeItem('keeper_token');
      localStorage.removeItem('keeper_user');
    }
    return false;
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      await fetchUserSession();
      setIsLoading(false);
    })();
  }, [fetchUserSession]);

  // Removed periodic refresh - was causing page loops and annoying refreshes

  const login = (data: AuthSuccessData) => {
    if (data.user) {
      setUser(data.user);
      
      // In production, server sets HttpOnly cookie - use placeholder token
      // In development, store actual token for local testing
      if (!import.meta.env.PROD && data.token) {
        setToken(data.token);
        localStorage.setItem('keeper_user', JSON.stringify(data.user));
        localStorage.setItem('keeper_token', data.token);
        if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log('[AuthContext] Dev mode: stored auth in localStorage');
      } else {
        // Production: indicate authenticated via cookie
        setToken('cookie-based');
        if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log('[AuthContext] Production mode: auth via cookie only');
      }
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
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
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, updateUser, isLoading }}>
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