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
  const DEBUG_MAX = 50;

  function log(...a: any[]) { 
    if (DEBUG) console.log('[keeper:fetch-shim]', ...a); 
  }

  const keeper = (window as any).__keeper = (window as any).__keeper || {};
  const keeperDebug = (window as any).__keeperDebug = (window as any).__keeperDebug || (keeper as any).debug || {};
  (keeper as any).debug = keeperDebug;
  keeperDebug.enabled = Boolean(keeperDebug.enabled);
  keeperDebug.maxEntries = keeperDebug.maxEntries || DEBUG_MAX;
  keeperDebug.entries = Array.isArray(keeperDebug.entries) ? keeperDebug.entries : [];
  keeperDebug.apiBase = API_BASE || 'https://api.ke3p.com';
  keeperDebug.origin = location.origin;

  const redactString = (value: string): string =>
    value
      .replace(/authorization:[^\n]+/gi, 'authorization:<redacted>')
      .replace(/keeper_session=[^;]+/gi, 'keeper_session=<redacted>')
      .replace(/bearer\s+[a-z0-9._-]+/gi, 'bearer <redacted>');

  const headersToObject = (headers: Headers | undefined) => {
    const result: Record<string, string> = {};
    if (!headers) return result;
    headers.forEach((value, key) => {
      const k = key.toLowerCase();
      if (k === 'authorization' || k === 'cookie') {
        result[key] = '<redacted>';
      } else {
        result[key] = redactString(value);
      }
    });
    return result;
  };

  const parseBody = (text: string | null, isJsonHint: boolean) => {
    if (!text) return null;
    if (isJsonHint) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return '<non-json>';
  };

  const readRequestBody = async (req: Request | undefined, init?: RequestInit, headers?: Headers) => {
    try {
      const hint = headers?.get('content-type')?.includes('application/json') ?? false;
      if (req) {
        const cloned = req.clone();
        const text = await cloned.text();
        return parseBody(redactString(text || ''), hint);
      }
      if (typeof init?.body === 'string') {
        return parseBody(redactString(init.body), hint);
      }
    } catch {
      return '<unreadable>';
    }
    return null;
  };

  const readResponseBody = async (res: Response | null | undefined) => {
    if (!res) return null;
    try {
      const contentType = res.headers.get('content-type') || '';
      const text = await res.clone().text();
      const isJson = contentType.includes('application/json');
      return parseBody(text || null, isJson);
    } catch {
      return '<unreadable>';
    }
  };

  const emitDebugEntry = async ({
    rawInput,
    req,
    init,
    headers,
    urlObj,
    method,
    authStripped,
    started,
    response,
    error,
  }: {
    rawInput: RequestInfo | URL;
    req?: Request;
    init?: RequestInit;
    headers: Headers;
    urlObj: URL | null;
    method: string;
    authStripped: boolean;
    started: number;
    response?: Response | null;
    error?: any;
  }) => {
    if (!(window as any).__keeperDebug?.enabled) return;
    const keeperDbg = (window as any).__keeperDebug;
    const requestBody = await readRequestBody(req, init, headers);
    const responseBody = await readResponseBody(response);
    const durationMs = Date.now() - started;
    const entry = {
      id: `fetch-${started}-${Math.random().toString(16).slice(2, 8)}`,
      timestamp: new Date(started).toISOString(),
      method,
      url: urlObj ? urlObj.href : (req?.url || String(rawInput)),
      status: response?.status ?? null,
      durationMs,
      request: {
        headers: headersToObject(headers),
        body: requestBody,
        authHeaderStripped: authStripped ? 'yes' : 'no',
      },
      response: response
        ? {
            status: response.status,
            headers: headersToObject(response.headers),
            body: responseBody,
          }
        : undefined,
      error: error
        ? {
            message: error?.message || String(error),
            stack: error?.stack,
          }
        : undefined,
      domainSlug: response?.headers?.get?.('x-domain-slug') || undefined,
      domainResolution: response?.headers?.get?.('x-domain-resolution') || undefined,
    };

    keeperDbg.entries = [...(keeperDbg.entries || []), entry].slice(-(keeperDbg.maxEntries || DEBUG_MAX));
    if (typeof keeperDbg.onEntry === 'function') {
      try { keeperDbg.onEntry(entry, keeperDbg.entries); } catch {}
    }
    try {
      window.dispatchEvent(new CustomEvent('keeper:debug-fetch', { detail: entry }));
    } catch {}
  };

  keeperDebug.clear =
    keeperDebug.clear ||
    (() => {
      keeperDebug.entries = [];
      try {
        window.dispatchEvent(new CustomEvent('keeper:debug-clear'));
      } catch {}
    });

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
    const urlObj = toURL(input);
    const method = (req?.method || init?.method || 'GET').toUpperCase();
    let authStripped = false;

    // PROD: strip any Authorization header going to our API (extensions or libs can't force header auth)
    if (IS_PROD && api && headers.has('Authorization')) {
      headers.delete('Authorization');
      authStripped = true;
    }

    // DEV only: allow token injection from storage for convenience
    if (!IS_PROD && api && !headers.has('Authorization')) {
      const t = localStorage.getItem('keeper_token') || sessionStorage.getItem('keeper_token');
      if (t) headers.set('Authorization', `Bearer ${t}`);
    }

    const nextInit: RequestInit = {
      ...(req ? {} : init),
      headers,
      credentials: init?.credentials || 'include',
    };

    const started = Date.now();
    let error: any;
    let res: Response | null = null;
    try {
      res = await ORIG(req ? new Request(req, nextInit) : (input as any), nextInit);
    } catch (err: any) {
      error = err;
      throw err;
    } finally {
      await emitDebugEntry({
        rawInput: input,
        req,
        init,
        headers,
        urlObj,
        method,
        authStripped,
        started,
        response: res,
        error,
      });
    }
    if (DEBUG) {
      const path = urlObj ? (urlObj.origin === location.origin ? urlObj.pathname + urlObj.search : urlObj.href) : String(input);
      console.log(`[keeper:fetch] ${method} ${path} → ${res.status} (authHeaderStripped: ${authStripped ? 'yes' : 'no'}) in ${Date.now() - started}ms`);
    }
    return res;
  };

  // Belt & suspenders: nuke any lingering dev tokens in PROD
  if ((import.meta as any)?.env?.PROD && !ALLOW_HEADER) {
    try { localStorage.removeItem('keeper_token'); } catch {}
    try { sessionStorage.removeItem('keeper_token'); } catch {}
  }

  log('installed (debug=', DEBUG, 'mode=', IS_PROD ? 'PROD' : 'DEV', 'allowHeader=', ALLOW_HEADER, ')');
})();

