import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// POST /api/dashboard/[id]/duplicate - duplicate a dashboard
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [original] = await sql`
      SELECT title, folder_id, widgets FROM dashboards WHERE id = ${id}
    `;

    if (!original) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    const [copy] = await sql`
      INSERT INTO dashboards (title, folder_id, widgets)
      VALUES (${(original.title as string) + ' (복사)'}, ${original.folder_id}, ${JSON.stringify(original.widgets)}::jsonb)
      RETURNING id, title, folder_id, widgets, is_favorite, created_at, updated_at
    `;

    return NextResponse.json(copy, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
