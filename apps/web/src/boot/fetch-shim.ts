// src/boot/fetch-shim.ts
// Global fetch interceptor for Keeper Platform
// In PRODUCTION: Uses HttpOnly cookies ONLY (no localStorage token injection)
// In DEV: Can inject Authorization header from localStorage for testing
// MUST be loaded first in main.tsx before any other imports

(function installGlobalFetchShim() {
  // Guard: don't double-install
  if ((window as any).__keeper?.fetchShimInstalled) return;

  const DEBUG = Boolean((import.meta as any)?.env?.VITE_FETCH_SHIM_DEBUG);
  const IS_PROD = (import.meta as any)?.env?.PROD === true;
  const ORIG = window.fetch.bind(window);

  function log(...args: any[]) {
    if (DEBUG) console.log('[fetch-shim]', ...args);
  }

  function urlFromInput(input: RequestInfo | URL): URL | null {
    try {
      if (input instanceof Request) return new URL(input.url);
      if (input instanceof URL) return input;
      if (typeof input === 'string') return new URL(input, window.location.origin);
      return null;
    } catch {
      return null;
    }
  }

  function isApi(url: URL): boolean {
    const apiEnv = (import.meta as any)?.env?.VITE_API_URL || '';
    const envHost = apiEnv ? new URL(apiEnv).host : '';
    const knownHosts = ['api.ke3p.com', envHost].filter(Boolean);

    const isKnownHost = knownHosts.includes(url.host);
    const isRelativeApi = url.origin === window.location.origin && url.pathname.startsWith('/api/');
    return isKnownHost || isRelativeApi;
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = urlFromInput(input);
    log('checking URL:', url?.toString());

    if (!url || !isApi(url)) {
      log('non-API request, bypass');
      return ORIG(input as any, init);
    }

    // Compose headers (support Request object)
    const headers = new Headers(input instanceof Request ? input.headers : init?.headers);

    // PRODUCTION: Never inject token from localStorage - rely on HttpOnly cookies
    // DEV: Allow Bearer token from localStorage for testing/local development
    if (!IS_PROD && !headers.has('Authorization')) {
      const token =
        localStorage.getItem('keeper_token') ||
        sessionStorage.getItem('keeper_token') ||
        '';
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
        log('✓ DEV: injected Bearer token from storage');
      }
    }

    log('API match → mode:', IS_PROD ? 'PROD (cookies only)' : 'DEV (fallback to storage)', 
        'has Authorization?', headers.has('Authorization'));

    const nextInit: RequestInit = {
      ...(input instanceof Request ? {} : init),
      headers,
      credentials: init?.credentials || 'include', // Always send cookies
    };

    const nextInput =
      input instanceof Request ? new Request(input, nextInit) : url.toString();

    return ORIG(nextInput as any, nextInit);
  };

  (window as any).__keeper = (window as any).__keeper || {};
  (window as any).__keeper.fetchShimInstalled = true;
  (window as any).__keeper.fetchShimDebug = DEBUG;
  (window as any).__keeper.fetchShimMode = IS_PROD ? 'production' : 'development';

  log('installed (debug=', DEBUG, 'mode=', IS_PROD ? 'PROD' : 'DEV', ')');
})();

