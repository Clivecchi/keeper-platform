import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isTransientConnectionError,
  withConnectionRetry,
} from './prismaRetry.js'

describe('isTransientConnectionError', () => {
  it('detects Prisma P1017', () => {
    assert.equal(
      isTransientConnectionError({ code: 'P1017', message: 'Server has closed the connection.' }),
      true,
    )
  })

  it('detects message-only closed connection errors', () => {
    assert.equal(
      isTransientConnectionError(
        new Error(
          'Invalid `prisma.domain.findUnique()` invocation: Server has closed the connection.',
        ),
      ),
      true,
    )
  })

  it('rejects unrelated errors', () => {
    assert.equal(
      isTransientConnectionError(new Error('Unique constraint failed on the fields: (`slug`)')),
      false,
    )
  })
})

describe('withConnectionRetry', () => {
  it('retries then succeeds after a transient failure', async () => {
    let attempts = 0
    const result = await withConnectionRetry(
      async () => {
        attempts += 1
        if (attempts === 1) {
          throw new Error('Server has closed the connection.')
        }
        return 'ok'
      },
      { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 1 },
    )

    assert.equal(result, 'ok')
    assert.equal(attempts, 2)
  })

  it('does not retry non-transient errors', async () => {
    let attempts = 0
    await assert.rejects(
      () =>
        withConnectionRetry(
          async () => {
            attempts += 1
            throw new Error('Unique constraint failed')
          },
          { maxRetries: 3, baseDelayMs: 1, maxDelayMs: 1 },
        ),
      /Unique constraint failed/,
    )
    assert.equal(attempts, 1)
  })
})
