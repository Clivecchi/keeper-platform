/**
 * Nango popup OAuth — self-hosted instance at services.keeper.domains.
 * Uses nango.auth() (/oauth/connect + WebSocket), not Connect UI iframe.
 */
import Nango, { AuthError } from '@nangohq/frontend';
import { computeLayout, windowFeaturesToString } from '@nangohq/frontend/dist/authModal.js';
import { apiFetch } from './apiFetch';

const NANGO_HOST = 'https://services.keeper.domains';

const PLATFORM_INTEGRATION_SERVICES = ['railway', 'vercel', 'github'] as const;

type PlatformIntegrationService = (typeof PLATFORM_INTEGRATION_SERVICES)[number];

/** Matches apps/api resolveNangoIntegrationId — slug or VITE_NANGO_INTEGRATION_* override. */
function resolveNangoIntegrationId(service: string): string {
  if (PLATFORM_INTEGRATION_SERVICES.includes(service as PlatformIntegrationService)) {
    const envKey = `VITE_NANGO_INTEGRATION_${service.toUpperCase()}` as const;
    const override = (import.meta.env as Record<string, string | undefined>)[envKey]?.trim();
    if (override) return override;
  }
  return service;
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 600;

/**
 * Open OAuth popup synchronously before any await (popup blocker / Safari).
 * @nangohq/frontend 0.70.5 auth() does not accept a pre-opened Window; it calls window.open('')
 * when auth() runs. We open the popup here and temporarily patch window.open so auth() reuses it.
 */
function openOAuthPopupSync(): Window {
  const layout = computeLayout({ expectedWidth: POPUP_WIDTH, expectedHeight: POPUP_HEIGHT });
  const popup = window.open('', '_blank', windowFeaturesToString(layout));
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    throw new AuthError('Modal blocked by browser', 'blocked_by_browser');
  }
  return popup;
}

/**
 * Run nango.auth() while reusing a popup opened synchronously on click.
 * SDK 0.70.5 has no API to pass an existing Window into auth().
 */
async function authWithPreopenedPopup(
  nango: Nango,
  providerConfigKey: string,
  popup: Window,
): Promise<void> {
  const originalOpen = window.open;
  window.open = ((url?: string | URL, target?: string, features?: string) => {
    const urlString = url == null ? '' : String(url);
    if (urlString === '') {
      return popup;
    }
    return originalOpen.call(window, url, target, features);
  }) as typeof window.open;

  try {
    await nango.auth(providerConfigKey);
  } finally {
    window.open = originalOpen;
  }
}

export interface OpenIntegrationConnectOptions {
  service: string;
  domainId?: string | null;
  userId?: string;
  onConnected?: () => void;
}

type IntegrationSessionResult =
  | { sessionToken: string; connected?: undefined }
  | { connected: true; service: string; sessionToken?: undefined };

function isCustomConnectResult(
  body: IntegrationSessionResult,
): body is { connected: true; service: string } {
  return body.connected === true && typeof body.service === 'string';
}

/**
 * Request a connect session from Keeper API.
 * Services (vercel, github) → popup OAuth via nango.auth(). Custom (railway) → token verify only.
 *
 * Synchronous entry: opens the OAuth popup before returning the async Promise (popup blockers).
 * Invoke from the click handler as `void openIntegrationConnect(...)` without awaiting other work first.
 */
export function openIntegrationConnect(
  options: OpenIntegrationConnectOptions,
): Promise<void> {
  const oauthPopup = typeof window !== 'undefined' ? openOAuthPopupSync() : null;
  return runIntegrationConnect(options, oauthPopup);
}

async function runIntegrationConnect(
  { service, domainId, userId, onConnected }: OpenIntegrationConnectOptions,
  oauthPopup: Window | null,
): Promise<void> {
  try {
    const result = (await apiFetch('/api/integrations/session', {
      method: 'POST',
      body: JSON.stringify({
        service,
        domainId: domainId ?? undefined,
        userId,
      }),
    })) as IntegrationSessionResult;

    if (isCustomConnectResult(result)) {
      oauthPopup?.close();
      onConnected?.();
      return;
    }

    if (!result.sessionToken) {
      throw new Error('Connect session response missing sessionToken');
    }

    if (!oauthPopup) {
      throw new AuthError('OAuth popup is only available in the browser', 'unknown_error');
    }

    const nango = new Nango({
      host: NANGO_HOST,
      connectSessionToken: result.sessionToken,
    });

    await authWithPreopenedPopup(nango, resolveNangoIntegrationId(service), oauthPopup);

    onConnected?.();
  } catch (err) {
    if (oauthPopup && !oauthPopup.closed) {
      try {
        oauthPopup.close();
      } catch {
        // ignore
      }
    }
    if (err instanceof AuthError) {
      throw err;
    }
    if (err instanceof Error) {
      throw err;
    }
    throw new Error('Connect failed');
  }
}
