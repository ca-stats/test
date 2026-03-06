import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import { DataSourceEditor } from '@/components/settings/DataSourceEditor';

export default async function EditDataSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sources = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
  if (!sources[0]) notFound();

  const tables = await sql`
    SELECT * FROM table_schemas
    WHERE data_source_id = ${id}
    ORDER BY table_name ASC
  `;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <DataSourceEditor
        source={sources[0] as Record<string, unknown>}
        tables={tables as Record<string, unknown>[]}
      />
    </div>
  );
}
