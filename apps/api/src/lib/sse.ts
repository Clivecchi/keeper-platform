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
