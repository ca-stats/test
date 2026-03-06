import 'server-only';
import { sql } from '@/lib/db';

interface Column {
  name: string;
  type: string;
  description: string;
  user_note?: string;
}

export async function buildTableSchemas(): Promise<string> {
  const sources = await sql`
    SELECT id, name, type, description
    FROM data_sources WHERE is_active = true ORDER BY id
  `;

  if (sources.length === 0) return '(No data sources configured)';

  const parts: string[] = [];

  for (const source of sources) {
    const tables = await sql`
      SELECT table_name, columns, table_note
      FROM table_schemas
      WHERE data_source_id = ${source.id} AND is_active = true
      ORDER BY table_name
    `;

    if (tables.length === 0) continue;

    const sourceHeader = `=== ${source.name} (${source.type}) ===`;
    const sourceNote = source.description ? `Note: ${source.description}` : '';

    const tableLines = tables.map((t) => {
      const cols = (t.columns as Column[])
        .map((c) => {
          let line = `  ${c.name} (${c.type})`;
          if (c.description) line += ` -- ${c.description}`;
          if (c.user_note) line += ` [${c.user_note}]`;
          return line;
        })
        .join('\n');

      const tableNote = t.table_note ? `  Note: ${t.table_note}\n` : '';
      return `Table: ${t.table_name}\n${tableNote}${cols}`;
    });

    parts.push([sourceHeader, sourceNote, ...tableLines].filter(Boolean).join('\n\n'));
  }

  return parts.join('\n\n');
}
