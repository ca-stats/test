'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (res.ok) {
      router.push('/dashboard');
    } else {
      setError('잘못된 PIN입니다');
      setPin('');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Lock className="w-6 h-6 text-[var(--color-primary)]" />
          </div>
          <h1 className="text-xl font-semibold text-[var(--color-text)]">CAHW Dashboard</h1>
        </div>
        <input
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="PIN 입력"
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)] mb-4"
          autoFocus
        />
        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading || !pin}
          className="w-full py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? '확인 중...' : '로그인'}
        </button>
      </form>
    </div>
  );
}
