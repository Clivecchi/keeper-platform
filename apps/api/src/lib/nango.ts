/**
 * Nango client — shared singleton for integration OAuth and proxy.
 * Self-hosted instance at NANGO_HOST (not Nango Cloud).
 */
import { Nango } from '@nangohq/node';

let nangoClient: Nango | null = null;

export function isNangoConfigured(): boolean {
  return Boolean(process.env.NANGO_SECRET_KEY);
}

export function getNango(): Nango {
  const secretKey = process.env.NANGO_SECRET_KEY;
  if (!secretKey) {
    throw new Error('NANGO_SECRET_KEY is not configured');
  }
  if (!nangoClient) {
    nangoClient = new Nango({
      secretKey,
      host: process.env.NANGO_HOST,
    });
  }
  return nangoClient;
}

/** @deprecated Use getNango() — lazy init avoids import-time failure when env is unset. */
export const nango = {
  createConnectSession: (...args: Parameters<Nango['createConnectSession']>) =>
    getNango().createConnectSession(...args),
  proxy: (...args: Parameters<Nango['proxy']>) => getNango().proxy(...args),
};
