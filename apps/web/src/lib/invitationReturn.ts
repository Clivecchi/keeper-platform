export type InvitationAuthPreview = {
  domainName: string
  domainSlug: string
  role: string
  roleLabel: string
  inviterName: string
}

export function invitationTokenFromReturnTo(returnTo?: string | null): string | null {
  const raw = returnTo?.trim()
  if (!raw) return null
  try {
    const url = new URL(raw, 'https://ke3p.com')
    if (url.pathname !== '/invite/accept') return null
    const token = url.searchParams.get('token')?.trim() ?? ''
    return token || null
  } catch {
    return null
  }
}

export function isInviteAcceptPath(path?: string | null): boolean {
  return invitationTokenFromReturnTo(path) !== null || Boolean(path?.includes('/invite/accept'))
}

export function domainBoardPath(slug: string, dialogId?: string | null): string {
  const base = `/d/${encodeURIComponent(slug.trim())}?board=domain`
  const id = dialogId?.trim()
  return id ? `${base}&dialogId=${encodeURIComponent(id)}` : base
}

export function resolveAuthLandingPath(
  returnTo: string | undefined,
  arrivalSlug: string | undefined,
  fallback: string,
  arrivalDialogId?: string | null,
): string {
  const slug = arrivalSlug?.trim()
  if (slug && (!returnTo?.trim() || isInviteAcceptPath(returnTo))) {
    return domainBoardPath(slug, arrivalDialogId)
  }
  if (returnTo?.trim()) return returnTo.trim()
  return fallback
}

export function inviteAuthCopy(
  preview: InvitationAuthPreview | null,
  mode: 'login' | 'register',
  isInvite: boolean,
): { title: string; subtitle: string } {
  if (preview) {
    const arrival = `${preview.inviterName} invited you to ${preview.domainName} as ${preview.roleLabel}.`
    return {
      title: mode === 'register' ? 'Create your account' : "You're invited",
      subtitle:
        mode === 'register'
          ? `${arrival} Then you will arrive on that Domain.`
          : `${arrival} Sign in, or create an account if you are new to Keeper.`,
    }
  }
  if (isInvite) {
    return {
      title: mode === 'register' ? 'Create your account' : "You're invited",
      subtitle:
        mode === 'register'
          ? 'Create your account to accept the invitation.'
          : 'Sign in, or create an account if you are new to Keeper.',
    }
  }
  return {
    title: mode === 'register' ? 'Begin Your Journey' : 'Welcome back',
    subtitle: mode === 'register' ? 'Create your Keeper account.' : 'Sign in to continue',
  }
}

export function withNextQuery(path: string, returnTo?: string | null): string {
  if (!returnTo?.trim()) return path
  return `${path}?next=${encodeURIComponent(returnTo.trim())}`
}
