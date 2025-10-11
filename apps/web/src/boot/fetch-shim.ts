// src/boot/fetch-shim.ts
// Global fetch interceptor for Keeper Platform
// In PRODUCTION: Uses HttpOnly cookies ONLY (strips Authorization headers)
// In DEV: Can inject Authorization header from localStorage for testing
// MUST be loaded first in main.tsx before any other imports

(function installKeeperFetchShim() {
  // Guard: don't double-install
  if ((window as any).__keeper?.fetchShimInstalled) return;

  const ORIG = window.fetch.bind(window);
  const DEBUG = Boolean((import.meta as any)?.env?.VITE_FETCH_SHIM_DEBUG);
  const API_BASE = ((import.meta as any)?.env?.VITE_API_URL || '').replace(/\/$/, '');
  const ALLOW_HEADER = !!((import.meta as any)?.env?.VITE_ALLOW_HEADER_AUTH); // opt-in for local troubleshooting
  const IS_PROD = (import.meta as any)?.env?.PROD && !ALLOW_HEADER;

  function log(...a: any[]) { 
    if (DEBUG) console.log('[keeper:fetch-shim]', ...a); 
  }

  function toURL(input: RequestInfo | URL): URL | null {
    try {
      if (input instanceof URL) return input;
      if (input instanceof Request) return new URL(input.url);
      return new URL(String(input), location.href);
    } catch { 
      return null; 
    }
  }

  function isApi(input: RequestInfo | URL): boolean {
    const u = toURL(input);
    if (!u) return false;
    if (u.pathname.startsWith('/api/')) return true;
    if (API_BASE && u.href.startsWith(API_BASE)) return true;
    if (u.hostname === 'api.ke3p.com') return true;
    return false;
  }

  (window as any).__keeper = (window as any).__keeper || {};
  (window as any).__keeper.fetchShimInstalled = true;
  (window as any).__keeper.fetchShimDebug = DEBUG;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : undefined;
    const headers = new Headers(req ? req.headers : init?.headers);
    const api = isApi(input);

    // PROD: strip any Authorization header going to our API (extensions or libs can't force header auth)
    if (IS_PROD && api && headers.has('Authorization')) {
      headers.delete('Authorization');
      log('PROD: stripped Authorization for', toURL(input)?.href);
    }

    // DEV only: allow token injection from storage for convenience
    if (!IS_PROD && api && !headers.has('Authorization')) {
      const t = localStorage.getItem('keeper_token') || sessionStorage.getItem('keeper_token');
      if (t) {
        headers.set('Authorization', `Bearer ${t}`);
        log('DEV: injected Authorization from storage for', toURL(input)?.href);
      }
    }

    const nextInit: RequestInit = {
      ...(req ? {} : init),
      headers,
      credentials: init?.credentials || 'include',
    };

    return ORIG(req ? new Request(req, nextInit) : (input as any), nextInit);
  };

  // Belt & suspenders: nuke any lingering dev tokens in PROD
  if ((import.meta as any)?.env?.PROD && !ALLOW_HEADER) {
    try { localStorage.removeItem('keeper_token'); } catch {}
    try { sessionStorage.removeItem('keeper_token'); } catch {}
  }

  log('installed (debug=', DEBUG, 'mode=', IS_PROD ? 'PROD' : 'DEV', 'allowHeader=', ALLOW_HEADER, ')');
})();

