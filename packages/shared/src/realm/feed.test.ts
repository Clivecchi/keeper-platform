import { describe, expect, it } from 'vitest'
import { resolveRealmFeedSessionDomain } from './feed.js'

describe('resolveRealmFeedSessionDomain', () => {
  const livecchi = { id: 'dom-biz', name: 'livecchi.biz' }
  const ke3p = { id: 'dom-ke3p', name: 'ke3p' }
  const domainById = new Map([
    [livecchi.id, livecchi],
    [ke3p.id, ke3p],
  ])

  it('returns the Dialog domain when it is in reach', () => {
    expect(resolveRealmFeedSessionDomain('dom-ke3p', domainById)).toBe(ke3p)
  })

  it('does not stamp an orphan session onto the Realm anchor', () => {
    expect(resolveRealmFeedSessionDomain(null, domainById)).toBeNull()
    expect(resolveRealmFeedSessionDomain('  ', domainById)).toBeNull()
    expect(resolveRealmFeedSessionDomain(undefined, domainById)).toBeNull()
  })

  it('does not invent a domain for a Dialog outside the viewer reach', () => {
    expect(resolveRealmFeedSessionDomain('dom-other', domainById)).toBeNull()
  })
})
