/**
 * MCP OAuth 2.1 authorization server routes (Phase B).
 * CIMD + DCR, PKCE S256, KAM consent, token + revoke.
 */
import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@keeper/database';
import { csrfGuard, setSessionCookie } from '../kam/session.js';
import {
  createAuthorizationCode,
  exchangeAuthorizationCode,
  filterRequestedScopes,
  listGrantableDomains,
  parseScopeParam,
  redirectUriAllowed,
  refreshAccessToken,
  registerDynamicClient,
  resolveOauthClient,
  revokeByToken,
  signConsentTicket,
  userCanGrantDomain,
  validateResourceParam,
  verifyConsentTicket,
  type ConsentTicketPayload,
} from '../services/McpOauthGrantService.js';
import { MCP_OAUTH_ISSUER, MCP_OAUTH_RESOURCE } from './oauthDiscovery.js';
import {
  renderOauthConsentPage,
  renderOauthErrorPage,
  renderOauthLoginPage,
} from './oauthConsentHtml.js';

const router = Router();

function currentUser(req: Request): { id: string; email?: string } | null {
  const u = (req as Request & { user?: { id?: string; email?: string } }).user;
  if (!u?.id) return null;
  return { id: u.id, email: u.email };
}

function sendHtml(res: Response, status: number, html: string): void {
  res.status(status).type('html').send(html);
}

function clientDisplayName(client: { client_name: string | null; client_id: string }): string {
  if (client.client_name) return client.client_name;
  if (client.client_id.startsWith('https://')) {
    try {
      return new URL(client.client_id).hostname;
    } catch {
      /* fall through */
    }
  }
  return client.client_id;
}

function authorizeUrlFromTicket(payload: ConsentTicketPayload): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: payload.client_id,
    redirect_uri: payload.redirect_uri,
    code_challenge: payload.code_challenge,
    code_challenge_method: payload.code_challenge_method,
    scope: payload.scope,
    resource: payload.resource || MCP_OAUTH_RESOURCE,
  });
  if (payload.state) params.set('state', payload.state);
  return `${MCP_OAUTH_ISSUER}/oauth/authorize?${params.toString()}`;
}

function renderLoginForTicket(
  res: Response,
  params: {
    clientName: string;
    ticketPayload: Omit<ConsentTicketPayload, 'exp'>;
    error?: string;
  },
): void {
  const consentTicket = signConsentTicket(params.ticketPayload);
  sendHtml(
    res,
    200,
    renderOauthLoginPage({
      clientName: params.clientName,
      consentTicket,
      error: params.error,
    }),
  );
}

function oauthErrorRedirect(
  res: Response,
  redirectUri: string,
  error: string,
  state: string | undefined,
  description?: string,
): void {
  try {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);
    if (description) url.searchParams.set('error_description', description);
    if (state) url.searchParams.set('state', state);
    res.redirect(302, url.toString());
  } catch {
    sendHtml(res, 400, renderOauthErrorPage('OAuth error', `${error}: ${description ?? ''}`));
  }
}

/**
 * GET /oauth/authorize
 */
router.get('/authorize', async (req: Request, res: Response) => {
  try {
    const responseType = String(req.query.response_type ?? '');
    const clientId = String(req.query.client_id ?? '').trim();
    const redirectUri = String(req.query.redirect_uri ?? '').trim();
    const codeChallenge = String(req.query.code_challenge ?? '').trim();
    const codeChallengeMethod = String(req.query.code_challenge_method ?? 'S256').trim();
    const state = String(req.query.state ?? '');
    const scopeRaw = typeof req.query.scope === 'string' ? req.query.scope : undefined;
    const resource =
      typeof req.query.resource === 'string' ? req.query.resource.trim() : MCP_OAUTH_RESOURCE;

    if (responseType !== 'code') {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Unsupported response_type', 'Only response_type=code is supported.'),
      );
    }
    if (!clientId || !redirectUri || !codeChallenge) {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Invalid request', 'client_id, redirect_uri, and code_challenge are required.'),
      );
    }
    if (codeChallengeMethod !== 'S256') {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Invalid PKCE', 'Only code_challenge_method=S256 is supported.'),
      );
    }
    if (!validateResourceParam(resource)) {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Invalid resource', `resource must be ${MCP_OAUTH_RESOURCE}`),
      );
    }

    const client = await resolveOauthClient(clientId);
    if (!client) {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Unknown client', 'Could not resolve client_id (CIMD fetch or DCR registration failed).'),
      );
    }
    if (!redirectUriAllowed(client.redirect_uris, redirectUri)) {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Invalid redirect_uri', 'redirect_uri is not registered for this client.'),
      );
    }

    const requestedScopes = parseScopeParam(scopeRaw);
    if (requestedScopes.length === 0) {
      return oauthErrorRedirect(res, redirectUri, 'invalid_scope', state, 'No supported scopes requested');
    }

    const ticketPayload = {
      client_id: clientId,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope: requestedScopes.join(' '),
      state,
      resource,
    };

    const displayName = clientDisplayName(client);
    const user = currentUser(req);
    if (!user) {
      // Same-origin HTML login — do not 302 to www SPA (blank "Loading…" in OAuth popups)
      return renderLoginForTicket(res, { clientName: displayName, ticketPayload });
    }

    const domains = await listGrantableDomains(user.id);
    const consentTicket = signConsentTicket(ticketPayload);

    return sendHtml(
      res,
      200,
      renderOauthConsentPage({
        clientName: displayName,
        clientId,
        requestedScopes,
        domains,
        consentTicket,
        userEmail: user.email,
      }),
    );
  } catch (err) {
    console.error('[mcp-oauth:authorize:get]', err);
    return sendHtml(res, 500, renderOauthErrorPage('Server error', 'Authorization failed unexpectedly.'));
  }
});

/**
 * POST /oauth/login — same-origin KAM sign-in for OAuth popups
 */
router.post('/login', csrfGuard, async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const ticket = typeof body.consent_ticket === 'string' ? body.consent_ticket : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    const payload = verifyConsentTicket(ticket);
    if (!payload) {
      return sendHtml(
        res,
        400,
        renderOauthErrorPage('Expired sign-in', 'Please restart the connection from Claude.'),
      );
    }

    const client = await resolveOauthClient(payload.client_id);
    const clientName = client ? clientDisplayName(client) : 'External client';
    const ticketPayload: Omit<ConsentTicketPayload, 'exp'> = {
      client_id: payload.client_id,
      redirect_uri: payload.redirect_uri,
      code_challenge: payload.code_challenge,
      code_challenge_method: payload.code_challenge_method,
      scope: payload.scope,
      state: payload.state,
      resource: payload.resource,
    };

    if (!email || !password) {
      return renderLoginForTicket(res, {
        clientName,
        ticketPayload,
        error: 'Email and password are required.',
      });
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user?.hashedPassword) {
      return renderLoginForTicket(res, {
        clientName,
        ticketPayload,
        error: 'Invalid email or password.',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return renderLoginForTicket(res, {
        clientName,
        ticketPayload,
        error: 'Invalid email or password.',
      });
    }

    const jwtSecret = process.env.JWT_SECRET?.trim();
    if (!jwtSecret) {
      return sendHtml(res, 500, renderOauthErrorPage('Server error', 'JWT_SECRET is not configured.'));
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    setSessionCookie(req, res, token);
    console.log('[mcp-oauth:login] session set', { email: user.email });

    return res.redirect(302, authorizeUrlFromTicket(payload));
  } catch (err) {
    console.error('[mcp-oauth:login]', err);
    return sendHtml(res, 500, renderOauthErrorPage('Server error', 'Sign-in failed unexpectedly.'));
  }
});

/**
 * POST /oauth/authorize — consent decision
 */
router.post('/authorize', csrfGuard, async (req: Request, res: Response) => {
  try {
    const user = currentUser(req);
    const body = req.body as Record<string, unknown>;
    const ticket = typeof body.consent_ticket === 'string' ? body.consent_ticket : '';
    const decision = typeof body.decision === 'string' ? body.decision : 'deny';
    const domainId = typeof body.domain_id === 'string' ? body.domain_id.trim() : '';
    const scopesRaw = body.scopes;
    const selectedScopes = filterRequestedScopes(
      Array.isArray(scopesRaw)
        ? scopesRaw.filter((s): s is string => typeof s === 'string')
        : typeof scopesRaw === 'string'
          ? [scopesRaw]
          : [],
    );

    const payload = verifyConsentTicket(ticket);
    if (!payload) {
      return sendHtml(res, 400, renderOauthErrorPage('Expired consent', 'Please restart the connection from Claude.'));
    }

    if (!user) {
      const client = await resolveOauthClient(payload.client_id);
      return renderLoginForTicket(res, {
        clientName: client ? clientDisplayName(client) : 'External client',
        ticketPayload: {
          client_id: payload.client_id,
          redirect_uri: payload.redirect_uri,
          code_challenge: payload.code_challenge,
          code_challenge_method: payload.code_challenge_method,
          scope: payload.scope,
          state: payload.state,
          resource: payload.resource,
        },
        error: 'Please sign in to continue.',
      });
    }

    if (decision !== 'approve') {
      return oauthErrorRedirect(res, payload.redirect_uri, 'access_denied', payload.state, 'User denied access');
    }

    if (!domainId || selectedScopes.length === 0) {
      const client = await resolveOauthClient(payload.client_id);
      const domains = await listGrantableDomains(user.id);
      return sendHtml(
        res,
        400,
        renderOauthConsentPage({
          clientName: client?.client_name || 'Client',
          clientId: payload.client_id,
          requestedScopes: parseScopeParam(payload.scope),
          domains,
          consentTicket: ticket,
          userEmail: user.email,
          error: 'Select a domain and at least one scope.',
        }),
      );
    }

    const allowedTicketScopes = new Set(parseScopeParam(payload.scope));
    const scopes = selectedScopes.filter((s) => allowedTicketScopes.has(s));
    if (scopes.length === 0) {
      return oauthErrorRedirect(res, payload.redirect_uri, 'invalid_scope', payload.state);
    }

    if (!(await userCanGrantDomain(user.id, domainId))) {
      return sendHtml(res, 403, renderOauthErrorPage('Forbidden', 'You cannot grant access for that domain.'));
    }

    const client = await resolveOauthClient(payload.client_id);
    if (!client || !redirectUriAllowed(client.redirect_uris, payload.redirect_uri)) {
      return sendHtml(res, 400, renderOauthErrorPage('Invalid client', 'Client or redirect_uri no longer valid.'));
    }

    const code = await createAuthorizationCode({
      clientId: payload.client_id,
      userId: user.id,
      domainId,
      scopes,
      redirectUri: payload.redirect_uri,
      codeChallenge: payload.code_challenge,
      codeChallengeMethod: payload.code_challenge_method,
      resource: payload.resource || MCP_OAUTH_RESOURCE,
    });

    const redirect = new URL(payload.redirect_uri);
    redirect.searchParams.set('code', code);
    if (payload.state) redirect.searchParams.set('state', payload.state);
    return res.redirect(302, redirect.toString());
  } catch (err) {
    console.error('[mcp-oauth:authorize:post]', err);
    return sendHtml(res, 500, renderOauthErrorPage('Server error', 'Consent failed unexpectedly.'));
  }
});

/**
 * POST /oauth/token — authorization_code + refresh_token
 */
router.post('/token', async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');

  try {
    const body = req.body as Record<string, unknown>;
    const grantType = String(body.grant_type ?? '');
    const clientId = String(body.client_id ?? '').trim();
    const clientSecret =
      typeof body.client_secret === 'string' ? body.client_secret : undefined;

    if (!clientId) {
      return res.status(400).json({ error: 'invalid_request', error_description: 'client_id required' });
    }

    if (grantType === 'authorization_code') {
      const code = String(body.code ?? '').trim();
      const redirectUri = String(body.redirect_uri ?? '').trim();
      const codeVerifier = String(body.code_verifier ?? '').trim();
      if (!code || !redirectUri || !codeVerifier) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'code, redirect_uri, and code_verifier are required',
        });
      }
      const tokens = await exchangeAuthorizationCode({
        code,
        clientId,
        redirectUri,
        codeVerifier,
        clientSecret,
      });
      if (!tokens) {
        return res.status(400).json({ error: 'invalid_grant' });
      }
      return res.status(200).json({
        access_token: tokens.access_token,
        token_type: 'Bearer',
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
      });
    }

    if (grantType === 'refresh_token') {
      const refreshToken = String(body.refresh_token ?? '').trim();
      if (!refreshToken) {
        return res.status(400).json({ error: 'invalid_request', error_description: 'refresh_token required' });
      }
      const tokens = await refreshAccessToken({
        refreshToken,
        clientId,
        clientSecret,
      });
      if (!tokens) {
        return res.status(400).json({ error: 'invalid_grant' });
      }
      return res.status(200).json({
        access_token: tokens.access_token,
        token_type: 'Bearer',
        expires_in: tokens.expires_in,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
      });
    }

    return res.status(400).json({ error: 'unsupported_grant_type' });
  } catch (err) {
    console.error('[mcp-oauth:token]', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

/**
 * POST /oauth/register — RFC 7591 DCR (fallback when CIMD unavailable)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const redirectUris = Array.isArray(body.redirect_uris)
      ? body.redirect_uris.filter((u): u is string => typeof u === 'string')
      : [];
    const registered = await registerDynamicClient({
      client_name: typeof body.client_name === 'string' ? body.client_name : undefined,
      redirect_uris: redirectUris,
      token_endpoint_auth_method:
        typeof body.token_endpoint_auth_method === 'string'
          ? body.token_endpoint_auth_method
          : 'none',
    });
    return res.status(201).json(registered);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'registration failed';
    return res.status(400).json({ error: 'invalid_client_metadata', error_description: message });
  }
});

/**
 * POST /oauth/revoke — RFC 7009
 */
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;
    const token = String(body.token ?? '').trim();
    if (token) await revokeByToken(token);
    // Always 200 per RFC 7009
    return res.status(200).json({ revoked: true });
  } catch (err) {
    console.error('[mcp-oauth:revoke]', err);
    return res.status(200).json({ revoked: true });
  }
});

export default router;
