import assert from 'node:assert/strict'
import { DomainAuthManager } from './domainAuth'

describe('DomainAuthManager redis gating', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('bypasses when DISABLE_REDIS=true and REDIS_URL missing', () => {
    process.env = { ...originalEnv }
    delete process.env.REDIS_URL
    process.env.DISABLE_REDIS = 'true'

    assert.doesNotThrow(() => {
      new DomainAuthManager({} as any)
    })
  })

  it('throws when DISABLE_REDIS is not set and REDIS_URL missing', () => {
    process.env = { ...originalEnv }
    delete process.env.REDIS_URL
    delete process.env.DISABLE_REDIS
    process.env.NODE_ENV = 'production'

    assert.throws(() => {
      new DomainAuthManager({} as any)
    })
  })
})

