const hexToHslString = (hex) => {
    if (!hex)
        return '0 0% 0%';
    hex = hex.replace(/^#/, '');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / d + 2;
                break;
            case b:
                h = (r - g) / d + 4;
                break;
        }
        h /= 6;
    }
    return `${(h * 360).toFixed(0)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
};
/**
 * Fetches a theme by its ID from the API. Can be authenticated or public.
 * @param themeId The UUID of the theme to fetch.
 * @param token The JWT for authenticating the request (optional).
 * @returns A Promise that resolves with the Theme object or null if an error occurs.
 */
export const fetchThemeById = async (themeId, token) => {
    const headers = {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    try {
        const response = await fetch(`/api/themes/${themeId}`, { headers });
        if (!response.ok) {
            console.error(`Failed to fetch theme ${themeId}. Status: ${response.status}`);
            return null;
        }
        const data = await response.json();
        if (!data.data) {
            console.error(`API response for theme ${themeId} is missing the 'data' field.`);
            return null;
        }
        // Convert the HEX colors from the API into the HSL strings required by the theme engine.
        const theme = data.data;
        // Convert all hex values in both light and dark modes to HSL strings
        Object.keys(theme.light).forEach(key => {
            theme.light[key] = hexToHslString(theme.light[key]);
        });
        Object.keys(theme.dark).forEach(key => {
            theme.dark[key] = hexToHslString(theme.dark[key]);
        });
        return theme;
    }
    catch (error) {
        console.error('An error occurred while fetching the theme:', error);
        return null;
    }
};
