'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export function NewDashboardButton() {
  const router = useRouter();

  async function handleClick() {
    const name = prompt('새 대시보드 이름을 입력하세요:');
    if (!name) return;
    const res = await fetch('/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: name, widgets: [] }),
    });
    const dashboard = await res.json();
    router.push(`/dashboard/${dashboard.id}`);
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-800 transition-colors text-sm cursor-pointer"
    >
      <Plus className="w-4 h-4" /> 새 대시보드
    </button>
  );
}
