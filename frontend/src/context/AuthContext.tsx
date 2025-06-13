import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import type { AuthUser, AuthSuccessData } from '../kam/auth/types';

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (data: AuthSuccessData) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('keeper_token');
      const storedUser = localStorage.getItem('keeper_user');
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error("Failed to parse auth data from localStorage", error);
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
      localStorage.setItem('keeper_user', JSON.stringify(data.user));
      localStorage.setItem('keeper_token', data.token);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('keeper_user');
    localStorage.removeItem('keeper_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, login, logout, isLoading }}>
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