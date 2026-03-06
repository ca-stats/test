import { sql } from '@/lib/db';
import { DataSourceList } from '@/components/settings/DataSourceList';

export default async function DataSourcesPage() {
  let sources: Record<string, unknown>[] = [];
  try {
    sources = await sql`
      SELECT ds.*,
        (SELECT COUNT(*)::int FROM table_schemas ts WHERE ts.data_source_id = ds.id) as table_count,
        (SELECT MAX(synced_at) FROM table_schemas ts WHERE ts.data_source_id = ds.id) as last_synced
      FROM data_sources ds ORDER BY ds.created_at ASC
    `;
  } catch {
    // DB not available
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <DataSourceList initialSources={sources} />
    </div>
  );
}
