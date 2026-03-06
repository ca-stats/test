'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Database, RefreshCw, Settings, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface DataSource {
  id: number;
  name: string;
  type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  description: string;
  table_count: number;
  last_synced: string | null;
}

export function DataSourceList({ initialSources }: { initialSources: Record<string, unknown>[] }) {
  const router = useRouter();
  const [sources, setSources] = useState<DataSource[]>(initialSources as unknown as DataSource[]);
  const [syncing, setSyncing] = useState<number | null>(null);

  async function handleSync(id: number) {
    setSyncing(id);
    try {
      await fetch(`/api/data-sources/${id}/sync`, { method: 'POST' });
      router.refresh();
      const res = await fetch('/api/data-sources');
      const data = await res.json();
      if (Array.isArray(data)) setSources(data as DataSource[]);
    } catch {
      alert('스키마 동기화에 실패했습니다.');
    }
    setSyncing(null);
  }

  async function handleToggle(id: number, current: boolean) {
    await fetch(`/api/data-sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setSources((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !current } : s));
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`"${name}" 데이터 소스를 삭제하시겠습니까?`)) return;
    await fetch(`/api/data-sources/${id}`, { method: 'DELETE' });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">데이터 소스</h1>
      </div>

      {/* Source cards */}
      {sources.length === 0 ? (
        <div className="text-center py-16 text-[var(--color-text-muted)]">
          <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>데이터 소스가 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sources.map((s) => (
            <div
              key={s.id}
              className={`bg-white border rounded-lg p-5 transition-colors ${s.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-[var(--color-secondary)]" />
                  <div>
                    <h3 className="font-medium text-[var(--color-text)]">{s.name}</h3>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      {s.type === 'bigquery' ? 'BigQuery' : 'MariaDB'}
                      {' · '}테이블 {s.table_count}개
                      {s.last_synced && ` · 마지막 동기화: ${new Date(s.last_synced).toLocaleDateString('ko-KR')}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(s.id, s.is_active)}
                  className="cursor-pointer"
                  title={s.is_active ? 'AI 프롬프트에 포함됨' : 'AI 프롬프트에서 제외됨'}
                >
                  {s.is_active
                    ? <ToggleRight className="w-6 h-6 text-[var(--color-primary)]" />
                    : <ToggleLeft className="w-6 h-6 text-gray-300" />
                  }
                </button>
              </div>
              {s.description && (
                <p className="text-sm text-[var(--color-text-muted)] mb-3">{s.description}</p>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSync(s.id)}
                  disabled={syncing === s.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncing === s.id ? 'animate-spin' : ''}`} />
                  {syncing === s.id ? '동기화 중...' : '스키마 동기화'}
                </button>
                <button
                  onClick={() => router.push(`/settings/data-sources/${s.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5" /> 편집
                </button>
                <button
                  onClick={() => handleDelete(s.id, s.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
