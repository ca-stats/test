'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Plus, Search, Star, ChevronDown, ChevronRight,
  LogOut, MoreHorizontal, Pencil, Copy, Trash2, Settings,
} from 'lucide-react';
import type { DashboardListItem } from '@/lib/types/dashboard';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchDashboards = useCallback(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setDashboards(data); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDashboards();
  }, [pathname, fetchDashboards]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [menuOpen]);

  const filtered = dashboards.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase())
  );

  const favorites = filtered.filter((d) => d.isFavorite);

  async function handleRename(id: string, currentTitle: string) {
    setMenuOpen(null);
    const newTitle = prompt('대시보드 이름을 입력하세요:', currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    await fetch(`/api/dashboard/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle }),
    });
    fetchDashboards();
  }

  async function handleDuplicate(id: string) {
    setMenuOpen(null);
    const res = await fetch(`/api/dashboard/${id}/duplicate`, { method: 'POST' });
    const copy = await res.json();
    fetchDashboards();
    router.push(`/dashboard/${copy.id}`);
  }

  async function handleDelete(id: string, title: string) {
    setMenuOpen(null);
    if (!confirm(`"${title}" 대시보드를 삭제하시겠습니까?`)) return;
    await fetch(`/api/dashboard/${id}`, { method: 'DELETE' });
    fetchDashboards();
    if (pathname === `/dashboard/${id}`) {
      router.push('/dashboard');
    }
  }

  async function handleNewDashboard() {
    const name = prompt('새 대시보드 이름을 입력하세요:');
    if (!name) return;
    const res = await fetch('/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, widgets: [] }),
    });
    const dashboard = await res.json();
    fetchDashboards();
    router.push(`/dashboard/${dashboard.id}`);
  }

  async function handleLogout() {
    await fetch('/api/auth', { method: 'DELETE' });
    window.location.href = '/login';
  }

  function DashboardItem({ d, icon }: { d: DashboardListItem; icon: React.ReactNode }) {
    const isActive = pathname === `/dashboard/${d.id}`;
    return (
      <div className="relative group flex items-center">
        <Link
          href={`/dashboard/${d.id}`}
          className={`flex-1 flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isActive
              ? 'bg-blue-50 text-[var(--color-primary)] font-medium'
              : 'text-[var(--color-text)] hover:bg-gray-50'
          }`}
        >
          {icon}
          <span className="truncate flex-1">{d.title}</span>
        </Link>
        <button
          onClick={(e) => { e.preventDefault(); setMenuOpen(menuOpen === d.id ? null : d.id); }}
          className="absolute right-1 p-1 rounded hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
        >
          <MoreHorizontal className="w-3.5 h-3.5 text-gray-400" />
        </button>
        {menuOpen === d.id && (
          <div ref={menuRef} className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-36">
            <button
              onClick={() => handleRename(d.id, d.title)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-gray-50 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" /> 이름 변경
            </button>
            <button
              onClick={() => handleDuplicate(d.id)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-[var(--color-text)] hover:bg-gray-50 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> 복제
            </button>
            <button
              onClick={() => handleDelete(d.id, d.title)}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> 삭제
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <aside className="w-60 h-screen bg-white border-r border-gray-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-50">
        <h2 className="font-bold text-[var(--color-text)] text-lg">CAHW</h2>
        <p className="text-xs text-[var(--color-text-muted)]">Dashboard</p>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-[var(--color-secondary)]"
          />
        </div>
      </div>

      {/* New dashboard button */}
      <div className="px-3 py-1">
        <button
          onClick={handleNewDashboard}
          className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-[var(--color-primary)] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> 새 대시보드
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {/* Favorites */}
        {favorites.length > 0 && (
          <div>
            <button
              onClick={() => setCollapsed((p) => ({ ...p, fav: !p.fav }))}
              className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 cursor-pointer"
            >
              {collapsed.fav ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              즐겨찾기
            </button>
            {!collapsed.fav && favorites.map((d) => (
              <DashboardItem key={d.id} d={d} icon={<Star className="w-3.5 h-3.5 text-[var(--color-accent)] fill-current" />} />
            ))}
          </div>
        )}

        {/* All dashboards */}
        <div>
          <button
            onClick={() => setCollapsed((p) => ({ ...p, all: !p.all }))}
            className="flex items-center gap-1 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1 cursor-pointer"
          >
            {collapsed.all ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            대시보드
          </button>
          {!collapsed.all && filtered.map((d) => (
            <DashboardItem key={d.id} d={d} icon={<LayoutDashboard className="w-3.5 h-3.5" />} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-50 px-3 py-2">
        <Link
          href="/settings/data-sources"
          className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
            pathname.startsWith('/settings')
              ? 'text-[var(--color-primary)] bg-blue-50 font-medium'
              : 'text-[var(--color-text-muted)] hover:bg-gray-50'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> 설정
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-muted)] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" /> 로그아웃
        </button>
      </div>
    </aside>
  );
}
