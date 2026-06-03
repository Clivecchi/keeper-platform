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

/** Named target so repeat Connect focuses the same window instead of spawning unrelated tabs. */
export const OAUTH_POPUP_NAME = 'keeper_integration_oauth';

const PLATFORM_INTEGRATION_SERVICES = ['railway', 'vercel', 'github'] as const;

type PlatformIntegrationService = (typeof PLATFORM_INTEGRATION_SERVICES)[number];

/** Shown when window.open is blocked (popup must open on click, before await). */
export function popupBlockedMessage(): string {
  const host =
    typeof window !== 'undefined' && window.location.hostname
      ? window.location.hostname
      : 'this site';
  return `Allow popups for ${host}, or use the authorization link below after you click Connect.`;
}

/** Matches apps/api resolveNangoIntegrationId — slug or VITE_NANGO_INTEGRATION_* override. */
export function resolveNangoIntegrationId(service: string): string {
  if (PLATFORM_INTEGRATION_SERVICES.includes(service as PlatformIntegrationService)) {
    const envKey = `VITE_NANGO_INTEGRATION_${service.toUpperCase()}` as const;
    const override = (import.meta.env as Record<string, string | undefined>)[envKey]?.trim();
    if (override) return override;
  }
  return service;
}

export function buildNangoOAuthConnectUrl(
  providerConfigKey: string,
  connectSessionToken: string,
): string {
  const authUrl = new URL(`${NANGO_HOST}/oauth/connect/${providerConfigKey}`);
  authUrl.searchParams.set('connect_session_token', connectSessionToken);
  return authUrl.toString();
}

function resolveNangoWebsocketUrl(host: string): string {
  const base = new URL(host.replace(/\/+$/, ''));
  base.pathname = '/';
  return base.toString().replace(/^https:/, 'wss:').replace(/^http:/, 'ws:');
}

const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 720;

function writeOAuthPopupPlaceholder(popup: Window, serviceLabel: string): void {
  try {
    popup.document.title = `Connect ${serviceLabel} — Keeper`;
    popup.document.body.innerHTML = `
      <div style="font-family: system-ui, sans-serif; padding: 2rem; max-width: 28rem; margin: 0 auto; color: #1a1a1a;">
        <h1 style="font-size: 1.125rem; font-weight: 600;">Connecting ${serviceLabel}</h1>
        <p style="font-size: 0.875rem; line-height: 1.5; color: #444;">
          Keeper is starting authorization. This window will redirect to ${serviceLabel} in a moment.
        </p>
        <p style="font-size: 0.8125rem; color: #666;">
          If you see GitHub <em>Settings → Applications</em> instead of an Install/Authorize screen,
          close that tab and use the authorization link in the Keeper panel.
        </p>
      </div>
    `;
  } catch {
    // Cross-origin or blocked document — navigation will still proceed.
  }
}

/**
 * Open an OAuth popup synchronously in the click handler — before any await.
 */
export function beginIntegrationOAuthPopup(serviceLabel = 'service'): Window {
  const layout = computeLayout({ expectedWidth: POPUP_WIDTH, expectedHeight: POPUP_HEIGHT });
  const features = windowFeaturesToString(layout);
  const popup = window.open('about:blank', OAUTH_POPUP_NAME, features);
  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    throw new AuthError(popupBlockedMessage(), 'blocked_by_browser');
  }
  writeOAuthPopupPlaceholder(popup, serviceLabel);
  try {
    popup.focus();
  } catch {
    // ignore
  }
  return popup;
}

/** Opens the Nango connect URL in a new tab (fallback when the popup is hard to find). */
export function openIntegrationOAuthTab(connectUrl: string): void {
  window.open(connectUrl, OAUTH_POPUP_NAME, 'noopener,noreferrer');
}

/**
 * Popup OAuth — equivalent to nango.auth() with connectSessionToken (AuthorizationModal + WS).
 */
function runPopupOAuthAuth(
  providerConfigKey: string,
  connectSessionToken: string,
  popup: Window,
): Promise<AuthSuccess> {
  const authUrl = new URL(buildNangoOAuthConnectUrl(providerConfigKey, connectSessionToken));

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
            'The authorization window was closed before the authorization flow was completed. Use the link in Keeper to try again.',
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
  /** Called once the connect session token exists — UI can show a manual auth link. */
  onSessionReady?: (connectUrl: string) => void;
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
  onSessionReady,
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

    const providerConfigKey = resolveNangoIntegrationId(service);
    const connectUrl = buildNangoOAuthConnectUrl(providerConfigKey, result.sessionToken);
    onSessionReady?.(connectUrl);

    if (!popup) {
      throw new AuthError(popupBlockedMessage(), 'blocked_by_browser');
    }

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

/** @deprecated Use popupBlockedMessage() for host-aware copy. */
export const POPUP_BLOCKED_MESSAGE = popupBlockedMessage();
