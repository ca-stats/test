'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Save, RefreshCw, ChevronDown, ChevronRight, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface Column {
  name: string;
  type: string;
  description: string;
  user_note: string;
}

interface TableSchema {
  id: number;
  table_name: string;
  columns: Column[];
  table_note: string;
  is_active: boolean;
  synced_at: string | null;
}

export function DataSourceEditor({
  source,
  tables: initialTables,
}: {
  source: Record<string, unknown>;
  tables: Record<string, unknown>[];
}) {
  const router = useRouter();
  const [name, setName] = useState(source.name as string);
  const [description, setDescription] = useState((source.description as string) || '');
  const [isActive, setIsActive] = useState(source.is_active as boolean);
  const [tables, setTables] = useState<TableSchema[]>(initialTables as unknown as TableSchema[]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function updateTableNote(tableId: number, note: string) {
    setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, table_note: note } : t));
  }

  function toggleTable(tableId: number) {
    setTables((prev) => prev.map((t) => t.id === tableId ? { ...t, is_active: !t.is_active } : t));
  }

  function updateColumnNote(tableId: number, colIdx: number, note: string) {
    setTables((prev) => prev.map((t) => {
      if (t.id !== tableId) return t;
      const cols = [...t.columns];
      cols[colIdx] = { ...cols[colIdx], user_note: note };
      return { ...t, columns: cols };
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/data-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          is_active: isActive,
          tables: tables.map((t) => ({
            id: t.id,
            table_note: t.table_note,
            is_active: t.is_active,
            columns: t.columns,
          })),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      alert('저장에 실패했습니다.');
    }
    setSaving(false);
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/data-sources/${source.id}/sync`, { method: 'POST' });
      const data = await res.json();
      if (data.tables) setTables(data.tables as TableSchema[]);
    } catch {
      alert('스키마 동기화에 실패했습니다.');
    }
    setSyncing(false);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/settings/data-sources')}
          className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> 데이터 소스 목록
        </button>
        <div className="flex items-center gap-2">
          {saved && <span className="text-xs text-green-600">저장됨</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] rounded-lg hover:bg-blue-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      {/* Source info */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">이름</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
            />
          </div>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">타입</label>
              <p className="px-3 py-2 text-sm text-[var(--color-text)] bg-gray-50 rounded-lg">
                {source.type === 'bigquery' ? 'BigQuery' : 'MariaDB'}
              </p>
            </div>
            <button
              onClick={() => setIsActive(!isActive)}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer"
            >
              {isActive
                ? <><ToggleRight className="w-5 h-5 text-[var(--color-primary)]" /> 활성</>
                : <><ToggleLeft className="w-5 h-5 text-gray-300" /> 비활성</>
              }
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">설명 (AI에게 전달됨)</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
            placeholder="이 데이터 소스에 대한 설명을 입력하세요"
          />
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-medium text-[var(--color-text)]">테이블 ({tables.length})</h3>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '동기화 중...' : '스키마 동기화'}
          </button>
        </div>

        {tables.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--color-text-muted)]">
            스키마 동기화 버튼을 클릭하여 테이블 정보를 가져오세요.
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {tables.map((t) => (
              <div key={t.id}>
                {/* Table header */}
                <div className="flex items-center gap-2 px-5 py-3 hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => toggleExpand(t.id)}
                    className="cursor-pointer"
                  >
                    {expanded.has(t.id)
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                  <span className="flex-1 text-sm font-mono text-[var(--color-text)]">{t.table_name}</span>
                  <span className="text-xs text-[var(--color-text-muted)]">{t.columns.length}개 컬럼</span>
                  <button onClick={() => toggleTable(t.id)} className="cursor-pointer">
                    {t.is_active
                      ? <ToggleRight className="w-5 h-5 text-[var(--color-primary)]" />
                      : <ToggleLeft className="w-5 h-5 text-gray-300" />
                    }
                  </button>
                </div>

                {/* Expanded: table note + columns */}
                {expanded.has(t.id) && (
                  <div className="px-5 pb-4 ml-6">
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-[var(--color-text-muted)] mb-1">테이블 메모 (AI에게 전달됨)</label>
                      <input
                        value={t.table_note}
                        onChange={(e) => updateTableNote(t.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                        placeholder="이 테이블에 대한 메모를 입력하세요"
                      />
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-gray-100">
                            <th className="pb-2 pr-4 font-medium">컬럼</th>
                            <th className="pb-2 pr-4 font-medium">타입</th>
                            <th className="pb-2 pr-4 font-medium">설명 (DB)</th>
                            <th className="pb-2 font-medium">메모 (사용자)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {t.columns.map((col, idx) => (
                            <tr key={col.name} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                              <td className="py-2 pr-4 font-mono text-xs">{col.name}</td>
                              <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">{col.type}</td>
                              <td className="py-2 pr-4 text-xs text-[var(--color-text-muted)]">{col.description || '—'}</td>
                              <td className="py-2">
                                <input
                                  value={col.user_note}
                                  onChange={(e) => updateColumnNote(t.id, idx, e.target.value)}
                                  className="w-full px-2 py-1 text-xs border border-gray-100 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
                                  placeholder="추가 정보..."
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
