/**
 * Nango client — shared singleton for integration OAuth and proxy.
 * Self-hosted instance at NANGO_HOST (not Nango Cloud).
 */
import { Nango } from '@nangohq/node';
import { resolveNangoHost } from './nangoConfig.js';

let nangoClient: Nango | null = null;
let nangoClientHost: string | null = null;

export function isNangoConfigured(): boolean {
  return Boolean(process.env.NANGO_SECRET_KEY?.trim());
}

export function getNango(): Nango {
  const secretKey = process.env.NANGO_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('NANGO_SECRET_KEY is not configured');
  }
  const host = resolveNangoHost();
  if (!nangoClient || nangoClientHost !== host) {
    nangoClient = new Nango({
      secretKey,
      host,
    });
    nangoClientHost = host;
  }
  return nangoClient;
}

export {
  buildConnectSessionBody,
  resolveNangoIntegrationId,
  resolveNangoHost,
  formatNangoError,
  DEFAULT_NANGO_HOST,
} from './nangoConfig.js';
export type { NangoConnectSessionBody } from './nangoConfig.js';

/** @deprecated Use getNango() — lazy init avoids import-time failure when env is unset. */
export const nango = {
  createConnectSession: (...args: Parameters<Nango['createConnectSession']>) =>
    getNango().createConnectSession(...args),
  proxy: (...args: Parameters<Nango['proxy']>) => getNango().proxy(...args),
};
