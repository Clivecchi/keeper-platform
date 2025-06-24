/**
 * Represents the structure of color tokens for a single mode (light or dark).
 */
export interface ThemeTokens {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
}
/**
 * Represents a full theme, containing both light and dark mode palettes.
 */
export interface Theme {
    id: string;
    slug: string;
    name: string;
    light: ThemeTokens;
    dark: ThemeTokens;
}
/**
 * Fetches a theme by its ID from the API. Can be authenticated or public.
 * @param themeId The UUID of the theme to fetch.
 * @param token The JWT for authenticating the request (optional).
 * @returns A Promise that resolves with the Theme object or null if an error occurs.
 */
export declare const fetchThemeById: (themeId: string, token?: string) => Promise<Theme | null>;
//# sourceMappingURL=themeApi.d.ts.map