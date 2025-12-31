import { prisma } from '@keeper/database';

export async function writeDomainAudit(opts: {
  action: 'create'|'update'|'delete'|'restore',
  domainId: string,
  actorUserId?: string,
  actorEmail?: string,
  ip?: string,
  userAgent?: string,
  before?: any,
  after?: any,
}) {
  try {
    await prisma.domainAudit.create({ data: {
      action: opts.action,
      domainId: opts.domainId,
      actorUserId: opts.actorUserId,
      actorEmail: opts.actorEmail,
      ip: opts.ip,
      userAgent: opts.userAgent,
      before: opts.before ?? null,
      after: opts.after ?? null,
    }});
  } catch (e) {
    // keep audit non-blocking
    console.error('domain-audit write failed', e);
  }
}


