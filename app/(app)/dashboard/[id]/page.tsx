import { sql } from '@/lib/db';
import { notFound } from 'next/navigation';
import { DashboardView } from '@/components/dashboard/DashboardView';

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let dashboard: Record<string, unknown> | undefined;
  try {
    const rows = await sql`
      SELECT id, title, folder_id, widgets, is_favorite, created_at, updated_at
      FROM dashboards WHERE id = ${id}
    `;
    dashboard = rows[0];
  } catch {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
        <div className="text-center">
          <p>데이터베이스에 연결할 수 없습니다.</p>
          <p className="text-sm mt-1">DATABASE_URL 환경 변수를 설정해주세요.</p>
        </div>
      </div>
    );
  }

  if (!dashboard) notFound();

  return (
    <DashboardView
      dashboard={{
        id: dashboard.id as string,
        title: dashboard.title as string,
        folderId: dashboard.folder_id as string | null,
        widgets: (dashboard.widgets || []) as import('@/lib/types/chart').ChartWidget[],
        createdAt: dashboard.created_at as string,
        updatedAt: dashboard.updated_at as string,
        isFavorite: dashboard.is_favorite as boolean,
      }}
    />
  );
}
