// src/lib/diagnostics.ts
// Diagnostic utilities exposed on window.__keeper for debugging

import { getApiBase } from './apiFetch';

interface KeeperDiagnostics {
  fetchShimInstalled?: boolean;
  fetchShimDebug?: boolean;
  authStatus?: 'checking' | 'authed' | 'guest';
  authGateLoaded?: boolean;
  user?: any;
  
  // Methods
  checkAuth: () => {
    hasToken: boolean;
    tokenLocation: 'localStorage' | 'sessionStorage' | 'none';
    tokenLength: number;
    tokenPreview: string;
    authGateStatus?: string;
  };
  
  checkApiConnection: () => Promise<{
    apiUrl: string;
    healthEndpoint: string;
    healthStatus: number | null;
    healthOk: boolean;
    error?: string;
  }>;

  /** Call GET /api/kam/auth/me and return status + summary. Use: window.__keeper.checkAuthMe() */
  checkAuthMe: () => Promise<{
    url: string;
    status: number;
    ok: boolean;
    hasUser: boolean;
    error?: string;
  }>;
  
  getBoardInfo: () => {
    lastError: any;
    storage: {
      boardLayouts: string[];
      totalKeys: number;
    };
  };
}

// Initialize diagnostics
if (typeof window !== 'undefined') {
  const keeper = ((window as any).__keeper || {}) as KeeperDiagnostics;
  
  keeper.checkAuth = () => {
    const localToken = localStorage.getItem('keeper_token');
    const sessionToken = sessionStorage.getItem('keeper_token');
    const token = localToken || sessionToken || '';
    
    return {
      hasToken: !!token,
      tokenLocation: localToken ? 'localStorage' : sessionToken ? 'sessionStorage' : 'none',
      tokenLength: token.length,
      tokenPreview: token ? `${token.slice(0, 20)}...${token.slice(-10)}` : 'none',
      authGateStatus: keeper.authStatus || 'not loaded'
    };
  };
  
  keeper.checkApiConnection = async () => {
    const apiBase = getApiBase();
    const apiUrl = apiBase || 'https://api.ke3p.com';
    const healthEndpoint = `${apiUrl}/api/health`;
    
    try {
      const res = await fetch(healthEndpoint, { method: 'GET' });
      return {
        apiUrl,
        healthEndpoint,
        healthStatus: res.status,
        healthOk: res.ok
      };
    } catch (err) {
      return {
        apiUrl,
        healthEndpoint,
        healthStatus: null,
        healthOk: false,
        error: String(err)
      };
    }
  };

  keeper.checkAuthMe = async () => {
    const apiBase = getApiBase();
    const apiUrl = apiBase || 'https://api.ke3p.com';
    const url = apiBase ? `${apiBase}/api/kam/auth/me` : '/api/kam/auth/me';
    const headers: Record<string, string> = {};
    const storedToken = localStorage.getItem('keeper_token') || sessionStorage.getItem('keeper_token');
    if (storedToken) headers['Authorization'] = `Bearer ${storedToken}`;
    try {
      const res = await fetch(url, { method: 'GET', credentials: 'include', headers });
      const body = await res.json().catch(() => ({}));
      return {
        url,
        status: res.status,
        ok: res.ok,
        hasUser: !!(body && body.user),
        error: res.ok ? undefined : res.statusText || `HTTP ${res.status}`
      };
    } catch (err) {
      return {
        url,
        status: 0,
        ok: false,
        hasUser: false,
        error: String(err)
      };
    }
  };
  
  keeper.getBoardInfo = () => {
    const boardLayouts: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('agentBoardLayout:')) {
        boardLayouts.push(key);
      }
    }
    
    return {
      lastError: (window as any).__lastBoardDataError || null,
      storage: {
        boardLayouts,
        totalKeys: localStorage.length
      }
    };
  };
  
  (window as any).__keeper = keeper;
  
  console.log('[Keeper] Diagnostics loaded. Try:\n' +
    '  window.__keeper.checkAuth()           — token presence\n' +
    '  window.__keeper.checkAuthMe()         — GET /api/kam/auth/me (returns {status, ok, hasUser})\n' +
    '  window.__keeper.checkApiConnection()  — health check\n' +
    '  window.__keeper.getBoardInfo()       — board storage'
  );
  try { console.log('[Keeper] API base =', getApiBase() || '(relative /api on ke3p.com)'); } catch {}
}

export {};

