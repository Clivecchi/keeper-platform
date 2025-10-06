// src/boot/fetch-shim.ts
// Global fetch interceptor for Keeper Platform
// Injects Authorization headers for all API requests
// MUST be loaded first in main.tsx before any other imports

(function installGlobalFetchShim() {
  // Guard: don't double-install
  if ((window as any).__keeper?.fetchShimInstalled) return;

  const DEBUG = Boolean((import.meta as any)?.env?.VITE_FETCH_SHIM_DEBUG);
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

    // Read token from storage
    const token =
      localStorage.getItem('keeper_token') ||
      sessionStorage.getItem('keeper_token') ||
      '';

    log('API match → inject token?', Boolean(token), 'has Authorization already?', headers.has('Authorization'));

    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
      log('✓ injected Bearer token');
    } else if (!token) {
      log('⚠ no token found in storage');
    }

    const nextInit: RequestInit = {
      ...(input instanceof Request ? {} : init),
      headers,
      credentials: init?.credentials || 'include',
    };

    const nextInput =
      input instanceof Request ? new Request(input, nextInit) : url.toString();

    return ORIG(nextInput as any, nextInit);
  };

  (window as any).__keeper = (window as any).__keeper || {};
  (window as any).__keeper.fetchShimInstalled = true;
  (window as any).__keeper.fetchShimDebug = DEBUG;

  log('installed (debug=', DEBUG, ')');
})();

