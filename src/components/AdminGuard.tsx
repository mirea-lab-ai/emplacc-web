'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserId } from '@/lib/auth';
import { fetchUserRole } from '@/features/roles/api';

const ALLOWED_ROLES = ['admin', 'manager'];

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'allowed' | 'denied'>('checking');

  useEffect(() => {
    let cancelled = false;
    async function check() {
      const userId = getUserId();
      if (!userId) {
        if (!cancelled) setStatus('denied');
        return;
      }
      try {
        const lookup = await fetchUserRole(userId);
        if (cancelled) return;
        const roleName = lookup.role?.name?.toLowerCase() ?? '';
        if (ALLOWED_ROLES.includes(roleName)) {
          setStatus('allowed');
        } else {
          setStatus('denied');
        }
      } catch {
        if (!cancelled) setStatus('denied');
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  if (status === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="flex items-center gap-3 t-caption">
          <span className="inline-block h-4 w-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/>
          Проверяем права доступа…
        </div>
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="space-y-5 max-w-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 grid place-items-center text-3xl">🔒</div>
          <div>
            <h2 className="t-heading text-white mb-2">Доступ запрещён</h2>
            <p className="t-body">Раздел администратора доступен только для ролей <span className="badge badge-emerald">admin</span> и <span className="badge badge-lime">manager</span>.</p>
          </div>
          <button onClick={() => router.replace('/')} className="btn-primary mx-auto">
            На главную
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
