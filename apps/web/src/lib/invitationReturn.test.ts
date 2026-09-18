// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  domainBoardPath,
  invitationTokenFromReturnTo,
  inviteAuthCopy,
  resolveAuthLandingPath,
  withNextQuery,
} from './invitationReturn'

describe('invitationReturn', () => {
  it('reads the invite token from a return path', () => {
    expect(invitationTokenFromReturnTo('/invite/accept?token=tok%2Fvalue')).toBe('tok/value')
    expect(invitationTokenFromReturnTo('/login')).toBeNull()
  })

  it('lands invited accounts on the Domain even when returnTo is the accept page', () => {
    expect(
      resolveAuthLandingPath('/invite/accept?token=abc', 'livecchi', '/home'),
    ).toBe('/d/livecchi?board=domain')
    expect(resolveAuthLandingPath('/invite/accept?token=abc', 'livecchi', '/home', 'dlg-1')).toBe(
      '/d/livecchi?board=domain&dialogId=dlg-1',
    )
    expect(resolveAuthLandingPath(undefined, 'livecchi', '/home')).toBe('/d/livecchi?board=domain')
    expect(resolveAuthLandingPath('/settings', undefined, '/home')).toBe('/settings')
    expect(resolveAuthLandingPath(undefined, undefined, '/home')).toBe('/home')
  })

  it('does not welcome invitees back', () => {
    const copy = inviteAuthCopy(
      { domainName: 'Livecchi', domainSlug: 'livecchi', role: 'bride', roleLabel: 'bride', inviterName: 'Chuck' },
      'login',
      true,
    )
    expect(copy.title).toBe("You're invited")
    expect(copy.subtitle).toContain('Chuck invited you to Livecchi as bride')
  })

  it('keeps next on register and login links', () => {
    expect(withNextQuery('/register', '/invite/accept?token=abc')).toBe(
      '/register?next=%2Finvite%2Faccept%3Ftoken%3Dabc',
    )
    expect(domainBoardPath('livecchi')).toBe('/d/livecchi?board=domain')
  })
})
