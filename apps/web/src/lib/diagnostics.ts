// src/lib/diagnostics.ts
// Diagnostic utilities exposed on window.__keeper for debugging

interface KeeperDiagnostics {
  fetchShimInstalled?: boolean;
  fetchShimDebug?: boolean;
  
  // Methods
  checkAuth: () => {
    hasToken: boolean;
    tokenLocation: 'localStorage' | 'sessionStorage' | 'none';
    tokenLength: number;
    tokenPreview: string;
  };
  
  checkApiConnection: () => Promise<{
    apiUrl: string;
    healthEndpoint: string;
    healthStatus: number | null;
    healthOk: boolean;
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
      tokenPreview: token ? `${token.slice(0, 20)}...${token.slice(-10)}` : 'none'
    };
  };
  
  keeper.checkApiConnection = async () => {
    const apiUrl = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
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
    '  window.__keeper.checkAuth()\n' +
    '  window.__keeper.checkApiConnection()\n' +
    '  window.__keeper.getBoardInfo()\n' +
    '  window.__keeper.fetchShimInstalled (boolean)\n' +
    '  window.__keeper.fetchShimDebug (boolean)'
  );
}

export {};

