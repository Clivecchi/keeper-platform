import type { Response } from 'express'

/**
 * Open an SSE response. Callers must write events and `res.end()`.
 * Disables proxy buffering so first tokens flush through Vercel rewrites.
 */
export function openSse(res: Response): void {
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write(': ok\n\n')
  flushSse(res)
}

export function writeSseEvent(
  res: Response,
  event: string,
  data: unknown,
): void {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  flushSse(res)
}

export function startSseHeartbeat(res: Response, intervalMs = 15_000): NodeJS.Timeout {
  return setInterval(() => {
    if (res.writableEnded) return
    res.write(`: ping ${Date.now()}\n\n`)
    flushSse(res)
  }, intervalMs)
}

function flushSse(res: Response): void {
  const flush = (res as Response & { flush?: () => void }).flush
  if (typeof flush === 'function') flush.call(res)
}

const STREAM_RESULT_OMIT = ['composedSystemPrompt', 'model_response_raw'] as const

/**
 * The Dialog needs the reply, receipts, and frame. The prompt and raw model
 * text stay in the agent log. A done event that carries them is large enough
 * to die in transit, and the client then reports that the stream ended with
 * no result.
 */
export function agentResultForStream<T>(result: T): T {
  if (!result || typeof result !== 'object') return result
  const record = result as { data?: unknown }
  if (!record.data || typeof record.data !== 'object' || Array.isArray(record.data)) return result
  const data = { ...(record.data as Record<string, unknown>) }
  for (const key of STREAM_RESULT_OMIT) delete data[key]
  return { ...(record as Record<string, unknown>), data } as T
}
