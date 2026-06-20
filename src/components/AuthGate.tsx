'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  clearSession, getSessionToken, isAuthed,
  isSessionExpired, isSessionAbsolutelyExpired,
  updateSessionExpiry, type Session,
} from '@/lib/auth';
import { getApiBaseUrl } from '@/lib/publicEnv';

type GateStatus = 'checking' | 'ok' | 'expired_normal' | 'expired_forced';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [status,  setStatus]  = useState<GateStatus>('checking');
  const [reason,  setReason]  = useState('');

  useEffect(() => {
    let cancelled = false;

    async function guard() {
      if (pathname === '/login' || pathname === '/callback') {
        if (!cancelled) setStatus('ok');
        return;
      }

      if (!isAuthed()) {
        router.replace('/login');
        return;
      }

      // Абсолютный срок истёк — нужен реологин
      if (isSessionAbsolutelyExpired()) {
        clearSession();
        if (!cancelled) { setReason('long_absence'); setStatus('expired_forced'); }
        return;
      }

      // Короткий срок ещё не истёк — ок
      if (!isSessionExpired()) {
        if (!cancelled) setStatus('ok');
        return;
      }

      // Короткий срок истёк → ротируем
      const token = getSessionToken();
      if (!token) { router.replace('/login'); return; }

      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/session/rotate`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data: Session = await res.json();
          updateSessionExpiry(data.expires_at);
          if (!cancelled) setStatus('ok');
          return;
        }

        // Ротация не удалась — читаем причину
        const body = await res.json().catch(() => ({}));
        const r: string = body?.reason ?? '';

        if (r === 'user_exit' || r === 'long_absence') {
          clearSession();
          if (!cancelled) { setReason(r); setStatus('expired_forced'); }
        } else {
          clearSession();
          router.replace('/login');
        }
      } catch {
        router.replace('/login');
      }
    }

    guard();
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (status === 'checking') {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="flex items-center gap-3 t-caption">
          <span className="inline-block h-4 w-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin-slow"/>
          Проверяем сессию…
        </div>
      </div>
    );
  }

  // Принудительное завершение — показываем объяснение
  if (status === 'expired_forced') {
    const isAbsence = reason === 'long_absence';
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="space-y-5 max-w-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20 grid place-items-center text-3xl">
            {isAbsence ? '🌙' : '👋'}
          </div>
          <div>
            <h2 className="t-heading text-app mb-2">
              {isAbsence ? 'Долгое отсутствие' : 'Сессия завершена'}
            </h2>
            <p className="t-body">
              {isAbsence
                ? 'Вы не входили более 7 дней. Войдите снова для продолжения работы.'
                : 'Сессия была завершена. Войдите снова.'}
            </p>
          </div>
          <a href="/login" className="btn-primary inline-flex mx-auto">Войти снова</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
