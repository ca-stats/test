import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET: list all data sources
export async function GET() {
  try {
    const rows = await sql`
      SELECT id, name, type, config, is_active, description, created_at, updated_at
      FROM data_sources ORDER BY created_at ASC
    `;

    const counts = await sql`
      SELECT data_source_id, COUNT(*)::int as table_count,
             MAX(synced_at) as last_synced
      FROM table_schemas GROUP BY data_source_id
    `;
    const countMap = new Map(
      counts.map((c) => [c.data_source_id, { tableCount: c.table_count, lastSynced: c.last_synced }])
    );

    const sources = rows.map((r) => {
      const config = r.config as Record<string, unknown>;
      const safeConfig = { ...config };
      delete safeConfig.password;
      delete safeConfig.passwordEnvVar;

      return {
        ...r,
        config: safeConfig,
        table_count: countMap.get(r.id)?.tableCount || 0,
        last_synced: countMap.get(r.id)?.lastSynced || null,
      };
    });

    return NextResponse.json(sources);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to list data sources';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
