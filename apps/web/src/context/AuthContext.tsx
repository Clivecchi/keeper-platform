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

  useEffect(() => {
    // In production, rely on HttpOnly cookies - don't trust localStorage
    // In development, allow localStorage for testing
    const IS_PROD = import.meta.env.PROD;
    
    if (IS_PROD) {
      // Production: Don't read from localStorage - AuthGate already validated with server
      console.log('[AuthContext] Production mode: skipping localStorage (using cookies)');
      setIsLoading(false);
      return;
    }

    // Development only: read from localStorage for local testing
    try {
      const storedToken = localStorage.getItem('keeper_token');
      const storedUser = localStorage.getItem('keeper_user');
      if (storedToken && storedUser) {
        console.log('[AuthContext] Dev mode: loaded auth from localStorage');
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("[AuthContext] Failed to parse auth data from localStorage", error);
      localStorage.removeItem('keeper_token');
      localStorage.removeItem('keeper_user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (data: AuthSuccessData) => {
    if (data.user && data.token) {
      setUser(data.user);
      setToken(data.token);
      
      // In production, server sets HttpOnly cookie - don't store in localStorage
      // In development, store for local testing
      if (!import.meta.env.PROD) {
        localStorage.setItem('keeper_user', JSON.stringify(data.user));
        localStorage.setItem('keeper_token', data.token);
        console.log('[AuthContext] Dev mode: stored auth in localStorage');
      } else {
        console.log('[AuthContext] Production mode: auth via cookie only');
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