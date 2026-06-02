/**
 * Nango Connect UI — self-hosted instance at services.keeper.domains.
 */
import Nango from '@nangohq/frontend';
import { apiFetch } from './apiFetch';

const NANGO_HOST = 'https://services.keeper.domains';

let nangoFrontend: Nango | null = null;

function getNangoFrontend(): Nango {
  if (!nangoFrontend) {
    nangoFrontend = new Nango({ host: NANGO_HOST });
  }
  return nangoFrontend;
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
 * Services (vercel, github) → Nango Connect UI. Custom (railway) → token verify only, no Nango UI.
 */
export async function openIntegrationConnect({
  service,
  domainId,
  userId,
  onConnected,
}: OpenIntegrationConnectOptions): Promise<void> {
  const result = (await apiFetch('/api/integrations/session', {
    method: 'POST',
    body: JSON.stringify({
      service,
      domainId: domainId ?? undefined,
      userId,
    }),
  })) as IntegrationSessionResult;

  if (isCustomConnectResult(result)) {
    onConnected?.();
    return;
  }

  if (!result.sessionToken) {
    throw new Error('Connect session response missing sessionToken');
  }

  const nango = getNangoFrontend();
  const connectUI = nango.openConnectUI({
    baseURL: NANGO_HOST,
    apiURL: NANGO_HOST,
    onEvent: (event) => {
      if (event.type === 'connect') {
        onConnected?.();
      }
    },
  });

  connectUI.setSessionToken(result.sessionToken);
}
