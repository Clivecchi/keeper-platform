import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const databaseUrl = String(process.env.DATABASE_URL || "").trim();
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is not configured for proxy");
    }
    pool = new Pool({ connectionString: databaseUrl, max: 5 });
  }
  return pool;
}

// TEMP: migrate to KAM by 2025-10-01
export async function initProxyTopics(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      "" +
        "CREATE TABLE IF NOT EXISTS proxy_topics (" +
        "  id text PRIMARY KEY," +
        "  slug text UNIQUE NOT NULL," +
        "  title text NOT NULL," +
        "  area text NOT NULL," +
        "  status text NOT NULL DEFAULT 'draft'," +
        "  notes_json text NOT NULL DEFAULT '[]'," +
        "  actions_json text NOT NULL DEFAULT '[]'," +
        "  created_at timestamptz NOT NULL DEFAULT now()" +
        ")"
    );
    await client.query(
      "CREATE INDEX IF NOT EXISTS idx_proxy_topics_created_at ON proxy_topics(created_at DESC)"
    );
  } finally {
    client.release();
  }
}

export type ProxyTopicRow = {
  id: string;
  slug: string;
  title: string;
  area: string;
  status: string;
  notes_json: string;
  actions_json: string;
  created_at: string;
};

export async function insertProxyTopic(input: {
  id: string;
  slug: string;
  title: string;
  area: string;
  status: string;
  notes_json: string;
  actions_json: string;
}): Promise<ProxyTopicRow> {
  const sql =
    "INSERT INTO proxy_topics (id, slug, title, area, status, notes_json, actions_json) " +
    "VALUES ($1, $2, $3, $4, $5, $6, $7) " +
    "RETURNING id, slug, title, area, status, notes_json, actions_json, created_at";
  const values = [
    input.id,
    input.slug,
    input.title,
    input.area,
    input.status,
    input.notes_json,
    input.actions_json,
  ];
  const { rows } = await getPool().query(sql, values);
  return rows[0] as ProxyTopicRow;
}

export async function listProxyTopics(options: {
  limit: number;
  q?: string;
  verbose?: boolean;
}): Promise<ProxyTopicRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.q && options.q.trim().length > 0) {
    params.push(`%${options.q.trim().toLowerCase()}%`);
    conditions.push("(lower(slug) LIKE $1 OR lower(title) LIKE $1)");
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitParamIndex = params.push(Math.min(Math.max(options.limit, 1), 200));
  const sql =
    "SELECT id, slug, title, area, status, notes_json, actions_json, created_at " +
    "FROM proxy_topics " +
    where +
    " ORDER BY created_at DESC " +
    ` LIMIT $${limitParamIndex}`;
  const { rows } = await getPool().query(sql, params as unknown[]);
  return rows as ProxyTopicRow[];
}





