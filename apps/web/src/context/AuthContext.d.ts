import { ReactNode } from 'react';
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
    isLoading: boolean;
}
export declare const AuthProvider: ({ children }: {
    children: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
export declare const useAuth: () => AuthContextType;
export {};
//# sourceMappingURL=AuthContext.d.ts.map