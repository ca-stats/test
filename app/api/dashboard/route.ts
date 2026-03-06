import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

// GET /api/dashboard - list all dashboards
export async function GET() {
  try {
    const dashboards = await sql`
      SELECT id, title, folder_id, is_favorite, updated_at
      FROM dashboards
      ORDER BY updated_at DESC
    `;
    return NextResponse.json(dashboards);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dashboards';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/dashboard - create new dashboard
export async function POST(req: NextRequest) {
  try {
    const { title, folderId, widgets } = await req.json();

    const [dashboard] = await sql`
      INSERT INTO dashboards (title, folder_id, widgets)
      VALUES (${title}, ${folderId || null}, ${JSON.stringify(widgets || [])})
      RETURNING id, title, folder_id, widgets, is_favorite, created_at, updated_at
    `;

    return NextResponse.json(dashboard, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
