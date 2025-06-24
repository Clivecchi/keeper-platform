import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useState, useContext, useEffect } from 'react';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('keeper_token');
            const storedUser = localStorage.getItem('keeper_user');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        }
        catch (error) {
            console.error("Failed to parse auth data from localStorage", error);
            localStorage.removeItem('keeper_token');
            localStorage.removeItem('keeper_user');
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    const login = (data) => {
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
    return (_jsx(AuthContext.Provider, { value: { user, token, isAuthenticated: !!token, login, logout, isLoading }, children: children }));
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
//# sourceMappingURL=AuthContext.js.map