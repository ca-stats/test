import { sql } from '@/lib/db';
import Link from 'next/link';
import { LayoutDashboard, Star } from 'lucide-react';
import { NewDashboardButton } from '@/components/dashboard/NewDashboardButton';

export default async function DashboardListPage() {
  let dashboards: Record<string, unknown>[] = [];
  let dbError = false;

  try {
    dashboards = await sql`
      SELECT id, title, folder_id, is_favorite, updated_at
      FROM dashboards ORDER BY updated_at DESC
    `;
  } catch {
    dbError = true;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">대시보드</h1>
        <NewDashboardButton />
      </div>

      {dbError ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>데이터베이스에 연결할 수 없습니다.</p>
          <p className="text-sm mt-1">DATABASE_URL 환경 변수를 설정해주세요.</p>
        </div>
      ) : dashboards.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <LayoutDashboard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>아직 대시보드가 없습니다.</p>
          <p className="text-sm mt-1">새 대시보드를 만들어 시작하세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboards.map((d: Record<string, unknown>) => (
            <Link
              key={d.id as string}
              href={`/dashboard/${d.id}`}
              className="bg-white rounded-lg border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-[var(--color-text)]">{d.title as string}</h3>
                {Boolean(d.is_favorite) && <Star className="w-4 h-4 text-[var(--color-accent)] fill-current" />}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                {new Date(d.updated_at as string).toLocaleDateString('ko-KR')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
