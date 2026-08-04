/**
 * Plain functional OAuth consent HTML (Phase B — polish deferred to Phase C).
 */
import type { GrantableDomain } from '../services/McpOauthGrantService.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderOauthConsentPage(params: {
  clientName: string;
  clientId: string;
  requestedScopes: string[];
  domains: GrantableDomain[];
  consentTicket: string;
  userEmail?: string;
  error?: string;
}): string {
  const scopeLabels: Record<string, string> = {
    'library.ro': 'Library read',
    'library.rw': 'Library read/write',
    'dialog.ro': 'Dialog Document read',
    'gloss.rw': 'Gloss write',
  };

  const domainOptions = params.domains
    .map(
      (d, i) =>
        `<option value="${escapeHtml(d.id)}"${i === 0 ? ' selected' : ''}>${escapeHtml(d.name)} (${escapeHtml(d.slug)})</option>`,
    )
    .join('\n');

  const scopeChecks = params.requestedScopes
    .map((scope) => {
      const label = scopeLabels[scope] ?? scope;
      return `<label style="display:block;margin:0.35rem 0"><input type="checkbox" name="scopes" value="${escapeHtml(scope)}" checked /> ${escapeHtml(label)} <code style="opacity:0.7">${escapeHtml(scope)}</code></label>`;
    })
    .join('\n');

  const errorBlock = params.error
    ? `<p style="color:#b91c1c;margin:0 0 1rem">${escapeHtml(params.error)}</p>`
    : '';

  const emptyDomains =
    params.domains.length === 0
      ? `<p style="color:#b91c1c">No domains available to grant. You need owner/admin on at least one domain.</p>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Authorize MCP access — Keeper</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 0; background: #f4f1ea; color: #1c1917; }
    main { max-width: 28rem; margin: 3rem auto; padding: 1.5rem 1.75rem; background: #fffef9; border: 1px solid #d6d3d1; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    p { line-height: 1.45; }
    label { font-family: system-ui, sans-serif; font-size: 0.95rem; }
    select { width: 100%; padding: 0.5rem; margin: 0.5rem 0 1rem; font-size: 1rem; }
    .actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
    button { font-family: system-ui, sans-serif; font-size: 0.95rem; padding: 0.55rem 1rem; cursor: pointer; }
    button.primary { background: #1c1917; color: #fafaf9; border: none; }
    button.secondary { background: transparent; border: 1px solid #a8a29e; }
    .meta { font-size: 0.85rem; opacity: 0.75; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <h1>Authorize external access</h1>
    <p><strong>${escapeHtml(params.clientName)}</strong> wants to connect to Keeper MCP.</p>
    ${params.userEmail ? `<p class="meta">Signed in as ${escapeHtml(params.userEmail)}</p>` : ''}
    <p class="meta">Client: ${escapeHtml(params.clientId)}</p>
    ${errorBlock}
    ${emptyDomains}
    <form method="POST" action="/oauth/authorize">
      <input type="hidden" name="consent_ticket" value="${escapeHtml(params.consentTicket)}" />
      <input type="hidden" name="decision" id="decision" value="approve" />
      <label for="domain_id">Domain</label>
      <select name="domain_id" id="domain_id" required ${params.domains.length === 0 ? 'disabled' : ''}>
        ${domainOptions}
      </select>
      <fieldset style="border:none;padding:0;margin:0">
        <legend style="font-family:system-ui,sans-serif;font-size:0.95rem;margin-bottom:0.35rem">Scopes</legend>
        ${scopeChecks}
      </fieldset>
      <div class="actions">
        <button type="submit" class="primary" ${params.domains.length === 0 ? 'disabled' : ''} onclick="document.getElementById('decision').value='approve'">Allow</button>
        <button type="submit" class="secondary" onclick="document.getElementById('decision').value='deny'">Deny</button>
      </div>
    </form>
  </main>
</body>
</html>`;
}

export function renderOauthErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title>
<style>body{font-family:Georgia,serif;margin:3rem;background:#f4f1ea;color:#1c1917}main{max-width:28rem}</style>
</head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p></main></body></html>`;
}

/**
 * Same-origin sign-in HTML for Claude / OAuth popups.
 * Avoids cross-subdomain 302 → SPA "Loading…" blank screen.
 */
export function renderOauthLoginPage(params: {
  clientName: string;
  consentTicket: string;
  error?: string;
}): string {
  const errorBlock = params.error
    ? `<p style="color:#b91c1c;margin:0 0 1rem">${escapeHtml(params.error)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Sign in — Keeper</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 0; background: #f4f1ea; color: #1c1917; }
    main { max-width: 28rem; margin: 3rem auto; padding: 1.5rem 1.75rem; background: #fffef9; border: 1px solid #d6d3d1; }
    h1 { font-size: 1.35rem; margin: 0 0 0.5rem; }
    p { line-height: 1.45; }
    label { font-family: system-ui, sans-serif; font-size: 0.9rem; display: block; margin: 0.75rem 0 0.25rem; }
    input[type="email"], input[type="password"] {
      width: 100%; box-sizing: border-box; padding: 0.55rem 0.65rem; font-size: 1rem;
      border: 1px solid #a8a29e; background: #fff;
    }
    button.primary {
      font-family: system-ui, sans-serif; font-size: 0.95rem; margin-top: 1.25rem;
      padding: 0.6rem 1rem; width: 100%; cursor: pointer;
      background: #1c1917; color: #fafaf9; border: none;
    }
    .meta { font-size: 0.85rem; opacity: 0.75; }
  </style>
</head>
<body>
  <main>
    <h1>Sign in to Keeper</h1>
    <p><strong>${escapeHtml(params.clientName)}</strong> wants to connect to your Keeper MCP.</p>
    <p class="meta">Sign in here to continue — you will choose a domain and scopes next.</p>
    ${errorBlock}
    <form method="POST" action="/oauth/login" autocomplete="on">
      <input type="hidden" name="consent_ticket" value="${escapeHtml(params.consentTicket)}" />
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required autocomplete="email" autofocus />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" />
      <button type="submit" class="primary">Continue</button>
    </form>
  </main>
</body>
</html>`;
}
