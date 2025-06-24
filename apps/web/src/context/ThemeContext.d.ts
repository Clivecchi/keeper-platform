import React, { ReactNode } from 'react';
import { Theme } from '../lib/themeApi';
type ThemeMode = 'light' | 'dark';
interface ThemeContextType {
    theme: Theme | null;
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
}
interface ThemeProviderProps {
    children: ReactNode;
}
export declare const ThemeProvider: React.FC<ThemeProviderProps>;
export declare const useTheme: () => ThemeContextType;
export {};
//# sourceMappingURL=ThemeContext.d.ts.map