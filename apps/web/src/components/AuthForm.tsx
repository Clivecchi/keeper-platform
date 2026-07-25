import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { redeemGuestHandoffKeyIfPresent } from '@/lib/kipGuestHandoff';
import { resolveLandingPathAfterAuth } from '@/lib/resolveHostDomain';
import { buildRealmBoardPath } from '@/lib/realmPaths';
import { usesCleanRealmPaths } from '@/lib/platformHost';

function resolvePostLoginPath(returnTo?: string): string | undefined {
  if (!returnTo?.trim() || typeof window === 'undefined') return returnTo?.trim();

  const hostname = window.location.hostname;
  if (!usesCleanRealmPaths(hostname)) return returnTo.trim();

  const match = returnTo.trim().match(/^\/d\/([^/?#]+)(\?.*)?$/);
  if (!match) return returnTo.trim();

  const [, slug, search = ''] = match;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const board = params.get('board') || 'domain';
  return buildRealmBoardPath(slug, board, params, hostname);
}

interface AuthFormProps {
  isRegister?: boolean;
  returnTo?: string;
  showHeading?: boolean;
}

export const AuthForm: React.FC<AuthFormProps> = ({ isRegister = false, returnTo, showHeading = true }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const auth = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const endpoint = isRegister ? '/api/kam/auth/register' : '/api/kam/auth/login';
    
    const payload: { email: string; password: string; name?: string; } = { email, password };
    if (isRegister && name) {
      payload.name = name;
    }

    try {
      const result = await apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (!isRegister) {
        // Never log JWT / token payloads — success + user identity only.
        const data =
          result && typeof result === 'object' && 'data' in result
            ? (result as { data?: { user?: { id?: string; email?: string } } }).data
            : undefined;
        console.log('✅ Login success:', {
          success: Boolean((result as { success?: boolean })?.success),
          userId: data?.user?.id ?? null,
          email: data?.user?.email ?? null,
        });
      }

      if (result.success) {
        auth.login(result.data);
        await redeemGuestHandoffKeyIfPresent();
        // Non-blocking auth check to confirm env-based API base URL works
        apiFetch('/api/kam/me', { method: 'GET' })
          .then(() => console.log('SystemStatus: /api/kam/me ok'))
          .catch((e) => console.warn('SystemStatus: /api/kam/me failed', e));
        const landing =
          resolvePostLoginPath(returnTo) ??
          (typeof window !== 'undefined'
            ? await resolveLandingPathAfterAuth(window.location.hostname, returnTo)
            : '/home');
        navigate(landing);
      } else {
        setError(result.error?.message || result.error || 'An unknown error occurred.');
      }
    } catch (err: unknown) {
      if (!isRegister) {
        console.error('❌ Login failed:', err);
      }
      const apiMessage =
        err && typeof err === 'object' && 'message' in err && typeof (err as { message?: string }).message === 'string'
          ? (err as { message: string }).message
          : null;
      setError(apiMessage || 'Failed to connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      {showHeading && (
        <h2 className="font-display text-4xl font-bold text-center mb-8 text-foreground">
          {isRegister ? 'Begin Your Journey' : 'Welcome Back'}
        </h2>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {isRegister && (
          <div>
            <label htmlFor="name" className="sr-only">Name</label>
            <input
              type="text"
              id="name"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-input border border-border rounded-md shadow-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="sr-only">Email Address</label>
          <input
            type="email"
            id="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full px-4 py-3 bg-input border border-border rounded-md shadow-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password"className="sr-only">Password</label>
          <input
            type="password"
            id="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-4 py-3 bg-input border border-border rounded-md shadow-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring focus:border-ring"
            required
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </div>
        {error && <p className="text-destructive text-sm text-center">{error}</p>}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-lg font-serif font-medium text-primary-foreground bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 transition-opacity"
          >
            {isLoading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}
          </button>
        </div>
      </form>
    </div>
  );
}; 