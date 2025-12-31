import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';
import { emitActivity } from './_activity-util.js';

type AgentEvent = {
  type: string;
  agentId: string;
  topicId?: string;
  draftId?: string;
  taskId?: string;
  activityId?: string;
  data?: unknown;
  at: string;
};

const router: Router = Router();

// Per-agent event emitters (simple in-memory bus)
const agentEmitters = new Map<string, EventEmitter>();

function getAgentEmitter(agentId: string): EventEmitter {
  let em = agentEmitters.get(agentId);
  if (!em) {
    em = new EventEmitter();
    // Increase listeners to avoid warnings in active sessions
    em.setMaxListeners(100);
    agentEmitters.set(agentId, em);
  }
  return em;
}

// Helper to send SSE event
function sseSend(res: Response, event: AgentEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// Public helper to broadcast events from other routes
export function broadcastAgentEvent(event: AgentEvent) {
  const em = getAgentEmitter(event.agentId);
  em.emit('event', event);
}

// Heartbeat every 25s to keep connections alive
function startHeartbeat(res: Response, agentId: string): NodeJS.Timeout {
  return setInterval(() => {
    res.write(`: heartbeat ${agentId} ${Date.now()}\n\n`);
  }, 25000);
}

// GET /api/agents/:id/events → SSE stream
router.get('/:id/events', (req: Request, res: Response) => {
  const agentId = req.params.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial comment and hello event
  res.write(`: connected to agent ${agentId}\n\n`);
  sseSend(res, { type: 'connected', agentId, at: new Date().toISOString() });

  const em = getAgentEmitter(agentId);
  const onEvent = (event: AgentEvent) => sseSend(res, event);
  em.on('event', onEvent);

  const hb = startHeartbeat(res, agentId);

  // Clean up on close
  req.on('close', () => {
    clearInterval(hb);
    em.off('event', onEvent);
    res.end();
  });
});

export default router;


