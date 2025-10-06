// src/auth/handleAuthError.ts
// Centralized handler for 401 errors - clears auth and redirects to login

export function handleAuthError(response?: Response, error?: any) {
  if (response?.status === 401 || error?.status === 401) {
    console.warn('[handleAuthError] 401 detected → clearing auth and redirecting to login');
    
    // Clear all auth data
    localStorage.removeItem('keeper_token');
    localStorage.removeItem('keeper_user');
    sessionStorage.removeItem('keeper_token');
    sessionStorage.removeItem('keeper_user');
    
    // Redirect to login
    window.location.assign('/login');
    return true;
  }
  return false;
}

// Export async version for use in catch blocks
export async function handle401Response(response: Response): Promise<boolean> {
  if (response.status === 401) {
    handleAuthError(response);
    return true;
  }
  return false;
}

