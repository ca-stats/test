import { Sidebar } from '@/components/navigation/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[var(--color-background)]">
        {children}
      </main>
    </div>
  );
}
