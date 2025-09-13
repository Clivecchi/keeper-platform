import type { Request, Response } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

// GET /api/admin/tenant-scan
export async function tenantScanHandler(req: Request, res: Response) {
  // Ensure authenticated user (any logged-in user for now)
  // authMiddlewareCompat is mounted at router level where this handler is attached.
  if (!(req as any).user?.id) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const q = async <T = any>(sql: string): Promise<T[]> => {
    return prisma.$queryRawUnsafe<T[]>(sql);
  };

  try {
    // Counts
    const [{ count: domains } = { count: 0 }] = await prisma
      .$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*)::int AS count FROM public."Domain";`) // Prisma model Domain → table "Domain"
      .catch(() => [{ count: 0 }]);

    // There is no separate custom_domains table in Prisma schema; use SslCertificate or customDomain fields snapshot.
    const [{ count: custom_domains } = { count: 0 }] = await prisma
      .$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*)::int AS count FROM public."Domain" WHERE "customDomain" IS NOT NULL;`)
      .catch(() => [{ count: 0 }]);

    const [{ count: keepers } = { count: 0 }] = await prisma
      .$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*)::int AS count FROM public."Keeper";`)
      .catch(() => [{ count: 0 }]);

    const [{ count: boards } = { count: 0 }] = await prisma
      .$queryRawUnsafe<{ count: number }[]>(`SELECT COUNT(*)::int AS count FROM public."Board";`)
      .catch(() => [{ count: 0 }]);

    const [{ with_domain, with_keeper } = { with_domain: 0, with_keeper: 0 }] = await prisma
      .$queryRawUnsafe<{ with_domain: number; with_keeper: number }[]>(`
        SELECT
          COUNT(*) FILTER (WHERE "domainId" IS NOT NULL)::int as with_domain,
          COUNT(*) FILTER (WHERE "keeperId" IS NOT NULL)::int as with_keeper
        FROM public."Board";
      `)
      .catch(() => [{ with_domain: 0, with_keeper: 0 }]);

    // Recents
    const recentDomains = await q<{ id: string; name: string; createdAt: Date; updatedAt: Date }>(
      `SELECT "id", "name", "createdAt", "updatedAt" FROM public."Domain" ORDER BY "createdAt" DESC NULLS LAST LIMIT 5;`
    ).catch(() => []);

    // Emulate custom_domains via Domain rows with customDomain set
    const recentCustomDomains = await q<{ id: string; customDomain: string; ownerId: string; createdAt: Date; updatedAt: Date }>(
      `SELECT "id", COALESCE("customDomain", '') AS "customDomain", "ownerId", "createdAt", "updatedAt" FROM public."Domain" WHERE "customDomain" IS NOT NULL ORDER BY "createdAt" DESC NULLS LAST LIMIT 5;`
    ).catch(() => []);

    const recentKeepers = await q<{ id: string; title: string; createdAt: Date; updatedAt: Date }>(
      `SELECT "id", "title" as "name", "createdAt", "updatedAt" FROM public."Keeper" ORDER BY "createdAt" DESC NULLS LAST LIMIT 5;`
    ).catch(() => []);

    // Prisma migrations (last 20)
    const migrations = await q<{ id: string; name: string; applied_at: Date }>(
      `SELECT id, name, applied_at FROM public._prisma_migrations ORDER BY applied_at DESC LIMIT 20;`
    ).catch(() => []);

    // pg_stat_user_tables for key tables
    const stats = await q<{ relname: string; n_tup_ins: number; n_tup_upd: number; n_tup_del: number; n_live_tup: number; n_dead_tup: number; last_vacuum: Date | null; last_autovacuum: Date | null; last_analyze: Date | null; last_autoanalyze: Date | null }>(
      `SELECT relname,
              n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup,
              last_vacuum, last_autovacuum, last_analyze, last_autoanalyze
       FROM pg_stat_user_tables
       WHERE relname IN ('Domain','Keeper','Board')
       ORDER BY relname;`
    ).catch(() => []);

    res.json({
      success: true,
      counts: { domains, custom_domains, keepers, boards },
      boards: { with_domain, with_keeper },
      recent: {
        domains: recentDomains,
        custom_domains: recentCustomDomains,
        keepers: recentKeepers
      },
      migrations,
      stats
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? 'unknown' });
  }
}

export default function adminTenantScanRouter() {
  // Lightweight adapter to expose as an Express Router if needed in future
  return { handler: tenantScanHandler };
}


