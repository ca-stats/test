import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET: single data source with its table schemas
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const sources = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
    if (!sources[0]) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const tables = await sql`
      SELECT * FROM table_schemas
      WHERE data_source_id = ${id}
      ORDER BY table_name ASC
    `;

    return NextResponse.json({ ...sources[0], tables });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: update data source
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { name, config, is_active, description, tables } = body;

    if (name !== undefined || config !== undefined || is_active !== undefined || description !== undefined) {
      await sql`
        UPDATE data_sources SET
          name = COALESCE(${name ?? null}, name),
          config = COALESCE(${config ? JSON.stringify(config) : null}, config),
          is_active = COALESCE(${is_active ?? null}, is_active),
          description = COALESCE(${description ?? null}, description),
          updated_at = NOW()
        WHERE id = ${id}
      `;
    }

    if (Array.isArray(tables)) {
      for (const t of tables) {
        if (t.id) {
          await sql`
            UPDATE table_schemas SET
              table_note = COALESCE(${t.table_note ?? null}, table_note),
              is_active = COALESCE(${t.is_active ?? null}, is_active),
              columns = COALESCE(${t.columns ? JSON.stringify(t.columns) : null}, columns)
            WHERE id = ${t.id}
          `;
        }
      }
    }

    const updated = await sql`SELECT * FROM data_sources WHERE id = ${id}`;
    return NextResponse.json(updated[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: remove data source and its schemas (CASCADE)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await sql`DELETE FROM data_sources WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete data source';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
