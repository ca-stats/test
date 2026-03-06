import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/dashboard/[id] - get single dashboard
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [dashboard] = await sql`
      SELECT id, title, folder_id, widgets, is_favorite, created_at, updated_at
      FROM dashboards WHERE id = ${id}
    `;

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/dashboard/[id] - update dashboard
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const [dashboard] = await sql`
      UPDATE dashboards SET
        title = COALESCE(${body.title ?? null}, title),
        folder_id = COALESCE(${body.folderId ?? null}, folder_id),
        widgets = COALESCE(${body.widgets ? JSON.stringify(body.widgets) : null}::jsonb, widgets),
        is_favorite = COALESCE(${body.isFavorite ?? null}, is_favorite),
        updated_at = now()
      WHERE id = ${id}
      RETURNING id, title, folder_id, widgets, is_favorite, created_at, updated_at
    `;

    if (!dashboard) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/dashboard/[id] - delete dashboard
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const [deleted] = await sql`
      DELETE FROM dashboards WHERE id = ${id} RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
