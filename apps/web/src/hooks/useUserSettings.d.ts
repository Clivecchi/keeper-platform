interface UserSettings {
    id: string;
    userId: string;
    themeMode?: string;
    preferred_theme_id?: string;
    respectSystemTheme?: boolean;
}
interface UseUserSettingsResult {
    settings: UserSettings | null;
    loading: boolean;
    error: string | null;
}
export declare function useUserSettings(): UseUserSettingsResult;
export {};
//# sourceMappingURL=useUserSettings.d.ts.map