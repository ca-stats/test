import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { introspectBigQuery } from '@/lib/bigquery';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sources = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
    const source = sources[0];
    if (!source) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const config = source.config as Record<string, unknown>;
    let introspected: { tableName: string; columns: { name: string; type: string; description: string }[] }[];

    if (source.type === 'bigquery') {
      introspected = await introspectBigQuery(
        config.project as string,
        config.datasets as string[]
      );
    } else {
      return NextResponse.json({ error: `Unsupported type: ${source.type}` }, { status: 400 });
    }

    // Get existing schemas to preserve user_notes
    const existing = await sql`
      SELECT table_name, columns FROM table_schemas WHERE data_source_id = ${id}
    `;
    const existingMap = new Map(
      existing.map((e) => [e.table_name as string, e.columns as { name: string; user_note?: string }[]])
    );

    // Upsert each table
    for (const table of introspected) {
      const oldCols = existingMap.get(table.tableName) || [];
      const noteMap = new Map(oldCols.map((c) => [c.name, c.user_note || '']));

      const mergedColumns = table.columns.map((col) => ({
        name: col.name,
        type: col.type,
        description: col.description,
        user_note: noteMap.get(col.name) || '',
      }));

      await sql`
        INSERT INTO table_schemas (data_source_id, table_name, columns, synced_at)
        VALUES (${id}, ${table.tableName}, ${JSON.stringify(mergedColumns)}, NOW())
        ON CONFLICT (data_source_id, table_name)
        DO UPDATE SET columns = ${JSON.stringify(mergedColumns)}, synced_at = NOW()
      `;
    }

    const tables = await sql`
      SELECT * FROM table_schemas WHERE data_source_id = ${id} ORDER BY table_name
    `;

    return NextResponse.json({ synced: introspected.length, tables });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Schema sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
