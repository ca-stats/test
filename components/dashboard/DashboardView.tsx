'use client';

import { useState, useCallback } from 'react';
import { Star, Pencil, Trash2 } from 'lucide-react';
import { DashboardGrid } from './DashboardGrid';
import { ChatPanel } from '@/components/chat/ChatPanel';
import type { Dashboard } from '@/lib/types/dashboard';
import type { ChartWidget } from '@/lib/types/chart';
import type { WidgetAction, WidgetFixEvent, ChatMessage as ChatMessageType } from '@/lib/types/api';

interface Props {
  dashboard: Dashboard;
}

export function DashboardView({ dashboard }: Props) {
  const [title, setTitle] = useState(dashboard.title);
  const [widgets, setWidgets] = useState<ChartWidget[]>(dashboard.widgets);
  const [saving, setSaving] = useState(false);
  const [isFavorite, setIsFavorite] = useState(dashboard.isFavorite);
  const [editingTitle, setEditingTitle] = useState(false);

  const saveDashboard = useCallback(async (updates: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/${dashboard.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        console.error('Dashboard save failed:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Dashboard save error:', err);
    } finally {
      setSaving(false);
    }
  }, [dashboard.id]);

  const saveWidgets = useCallback(async (updated: ChartWidget[]) => {
    await saveDashboard({ widgets: updated });
  }, [saveDashboard]);

  const handleLayoutChange = useCallback((updated: ChartWidget[]) => {
    setWidgets(updated);
    saveWidgets(updated);
  }, [saveWidgets]);

  const handleAiActions = useCallback((actions: WidgetAction[]) => {
    setWidgets((prev) => {
      let updated = [...prev];
      for (const action of actions) {
        if (action.action === 'create' && action.widget) {
          updated.push(action.widget);
        } else if (action.action === 'update' && action.widgetId && action.widget) {
          updated = updated.map((w) => w.id === action.widgetId ? action.widget! : w);
        } else if (action.action === 'delete' && action.widgetId) {
          updated = updated.filter((w) => w.id !== action.widgetId);
        }
      }
      saveWidgets(updated);
      return updated;
    });
  }, [saveWidgets]);

  function handleTitleSave(newTitle: string) {
    const trimmed = newTitle.trim();
    if (trimmed && trimmed !== title) {
      setTitle(trimmed);
      saveDashboard({ title: trimmed });
    }
    setEditingTitle(false);
  }

  function handleToggleFavorite() {
    const next = !isFavorite;
    setIsFavorite(next);
    saveDashboard({ isFavorite: next });
  }

  function handleDeleteWidget(widgetId: string) {
    const widget = widgets.find((w) => w.id === widgetId);
    if (!widget) return;
    if (!confirm(`"${widget.title}" 위젯을 삭제하시겠습니까?`)) return;
    setWidgets((prev) => {
      const updated = prev.filter((w) => w.id !== widgetId);
      saveWidgets(updated);
      return updated;
    });
  }

  const [fixMessages, setFixMessages] = useState<ChatMessageType[]>([]);

  const handleFixEvent = useCallback((event: WidgetFixEvent) => {
    let content: string;
    switch (event.type) {
      case 'fix_started':
        content = `"${event.widgetTitle}" 위젯의 쿼리 오류를 감지했습니다. 자동 수정 중... (${event.attempt}/${event.maxAttempts}회 시도)`;
        break;
      case 'fix_succeeded':
        content = `"${event.widgetTitle}" 위젯의 쿼리가 자동 수정되었습니다. (${event.attempt}회 시도)`;
        break;
      case 'fix_failed':
        content = `"${event.widgetTitle}" 위젯의 쿼리 자동 수정에 실패했습니다. (${event.attempt}/${event.maxAttempts}회 시도)\n오류: ${event.error}`;
        break;
    }
    setFixMessages((prev) => [...prev, { role: 'assistant', content, type: 'system' }]);
  }, []);

  function handleUpdateWidget(updatedWidget: ChartWidget) {
    setWidgets((prev) => {
      const updated = prev.map((w) => w.id === updatedWidget.id ? updatedWidget : w);
      saveWidgets(updated);
      return updated;
    });
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3">
          {editingTitle ? (
            <input
              autoFocus
              defaultValue={title}
              onBlur={(e) => handleTitleSave(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave(e.currentTarget.value);
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              className="text-lg font-bold text-[var(--color-text)] border-b-2 border-[var(--color-primary)] focus:outline-none bg-transparent"
            />
          ) : (
            <h1
              className="text-lg font-bold text-[var(--color-text)] cursor-pointer hover:text-[var(--color-primary)] transition-colors"
              onClick={() => setEditingTitle(true)}
              title="클릭하여 이름 변경"
            >
              {title}
            </h1>
          )}
          <button onClick={() => setEditingTitle(true)} className="p-1 hover:bg-gray-100 rounded cursor-pointer" title="이름 변경">
            <Pencil className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={handleToggleFavorite} className="cursor-pointer" title="즐겨찾기">
            <Star className={`w-4 h-4 ${isFavorite ? 'text-[var(--color-accent)] fill-current' : 'text-gray-300 hover:text-[var(--color-accent)]'}`} />
          </button>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
          {saving && <span>저장 중...</span>}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {widgets.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
            <p>AI 채팅으로 차트를 추가해보세요.</p>
          </div>
        ) : (
          <DashboardGrid
            widgets={widgets}
            onLayoutChange={handleLayoutChange}
            onDeleteWidget={handleDeleteWidget}
            onUpdateWidget={handleUpdateWidget}
            onFixEvent={handleFixEvent}
          />
        )}
      </div>

      {/* Chat */}
      <ChatPanel
        dashboardWidgets={widgets}
        onActions={handleAiActions}
        fixMessages={fixMessages}
      />
    </div>
  );
}
