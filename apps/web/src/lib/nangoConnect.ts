/**
 * Nango popup OAuth — self-hosted instance at services.keeper.domains.
 * Same /oauth/connect + WebSocket path as nango.auth(); no Connect UI iframe.
 */
import { AuthError } from '@nangohq/frontend';
import type { AuthSuccess } from '@nangohq/frontend';
import {
  AuthorizationModal,
  computeLayout,
  windowFeaturesToString,
} from '@nangohq/frontend/dist/authModal.js';
import { apiFetch } from './apiFetch';

const NANGO_HOST = 'https://services.keeper.domains';

/** Shown in Chronicle when window.open is blocked (popup must open on click, before await). */
export const POPUP_BLOCKED_MESSAGE =
  'Please allow popups for ke3p.com to connect this service';

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

function resolveNangoWebsocketUrl(host: string): string {
  const base = new URL(host.replace(/\/+$/, ''));
  base.pathname = '/';
  return base.toString().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 700;

/**
 * Open a blank OAuth popup synchronously in the click handler — before any await.
 * @nangohq/frontend 0.70.5: auth() and Nango constructor do not accept a pre-opened Window;
 * auth() calls window.open('') when invoked (after await). Call this from onClick first, then
 * completeIntegrationConnect().
 */
export function beginIntegrationOAuthPopup(): Window {
  const layout = computeLayout({ expectedWidth: POPUP_WIDTH, expectedHeight: POPUP_HEIGHT });
  const popup = window.open('', '_blank', windowFeaturesToString(layout));
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    throw new AuthError(POPUP_BLOCKED_MESSAGE, 'blocked_by_browser');
  }
  return popup;
}

/**
 * Popup OAuth — equivalent to nango.auth() with connectSessionToken (AuthorizationModal + WS).
 */
function runPopupOAuthAuth(
  providerConfigKey: string,
  connectSessionToken: string,
  popup: Window,
): Promise<AuthSuccess> {
  const authUrl = new URL(`${NANGO_HOST}/oauth/connect/${providerConfigKey}`);
  authUrl.searchParams.set('connect_session_token', connectSessionToken);

  return new Promise<AuthSuccess>((resolve, reject) => {
    let settled = false;
    let closeTimer: ReturnType<typeof setInterval> | null = null;

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (closeTimer) clearInterval(closeTimer);
      fn();
    };

    const modal = new AuthorizationModal({
      baseUrl: authUrl,
      debug: false,
      webSocketUrl: resolveNangoWebsocketUrl(NANGO_HOST),
      successHandler: (result) => {
        finish(() => {
          try {
            modal.close();
          } catch {
            // ignore
          }
          resolve(result);
        });
      },
      errorHandler: (errorType, errorDesc) => {
        finish(() => {
          try {
            modal.close();
          } catch {
            // ignore
          }
          reject(new AuthError(errorDesc, errorType));
        });
      },
    });

    modal.setModal(popup);

    closeTimer = setInterval(() => {
      if (!popup.closed) return;
      if (modal.isProcessingMessage) return;
      finish(() => {
        try {
          modal.close();
        } catch {
          // ignore
        }
        reject(
          new AuthError(
            'The authorization window was closed before the authorization flow was completed',
            'window_closed',
          ),
        );
      });
    }, 500);
  });
}

export interface OpenIntegrationConnectOptions {
  service: string;
  domainId?: string | null;
  userId?: string;
  onConnected?: () => void;
  /** Pre-opened via beginIntegrationOAuthPopup() in the click handler (Services only). */
  oauthPopup?: Window | null;
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
 * Services (vercel, github) → popup OAuth. Custom (railway) → token verify only.
 * For Services, pass oauthPopup from beginIntegrationOAuthPopup() called synchronously on click.
 */
export async function openIntegrationConnect({
  service,
  domainId,
  userId,
  onConnected,
  oauthPopup = null,
}: OpenIntegrationConnectOptions): Promise<void> {
  let popup = oauthPopup;

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
      popup?.close();
      onConnected?.();
      return;
    }

    if (!result.sessionToken) {
      throw new Error('Connect session response missing sessionToken');
    }

    if (!popup) {
      throw new AuthError(POPUP_BLOCKED_MESSAGE, 'blocked_by_browser');
    }

    const providerConfigKey = resolveNangoIntegrationId(service);
    const authResult = await runPopupOAuthAuth(providerConfigKey, result.sessionToken, popup);

    await apiFetch('/api/integrations/oauth-callback', {
      method: 'POST',
      body: JSON.stringify({
        service,
        connectionId: authResult.connectionId,
        providerConfigKey: authResult.providerConfigKey,
        domainId: domainId ?? undefined,
        userId,
      }),
    });

    onConnected?.();
  } catch (err) {
    if (popup && !popup.closed) {
      try {
        popup.close();
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
