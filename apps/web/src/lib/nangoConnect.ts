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

/**
 * Request a connect session from Keeper API and open Nango Connect UI.
 */
export async function openIntegrationConnect({
  service,
  domainId,
  userId,
  onConnected,
}: OpenIntegrationConnectOptions): Promise<void> {
  const { sessionToken } = (await apiFetch('/api/integrations/session', {
    method: 'POST',
    body: JSON.stringify({
      service,
      domainId: domainId ?? undefined,
      userId,
    }),
  })) as { sessionToken: string };

  const nango = getNangoFrontend();
  const connectUI = nango.openConnectUI({
    onEvent: (event) => {
      if (event.type === 'connect') {
        onConnected?.();
      }
    },
  });

  connectUI.setSessionToken(sessionToken);
}
