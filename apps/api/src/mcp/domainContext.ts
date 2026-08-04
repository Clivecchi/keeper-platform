/**
 * Shared domain labels for MCP tool envelopes (library.ro / dialog.ro).
 */
import { prisma } from '@keeper/database';

export type McpDomainLabel = {
  domainId: string;
  domainName: string;
  domainSlug: string;
};

export async function resolveMcpDomainLabel(domainId: string): Promise<McpDomainLabel> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true, name: true, slug: true },
  });
  if (!domain) {
    throw new Error(`Domain not found: ${domainId}`);
  }
  return {
    domainId: domain.id,
    domainName: domain.name,
    domainSlug: domain.slug,
  };
}
