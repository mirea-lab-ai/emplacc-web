'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function MainError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="grid min-h-[60dvh] place-items-center px-6 text-center">
      <div className="space-y-5 max-w-sm">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20 text-3xl">⚠️</div>
        <div>
          <h2 className="t-heading text-white mb-2">Что-то пошло не так</h2>
          <p className="t-body">Эта часть приложения не смогла загрузиться. Попробуйте ещё раз.</p>
        </div>
        <div className="flex justify-center gap-2">
          <button onClick={reset} className="btn-primary">Повторить</button>
          <Link href="/" className="btn-ghost">На главную</Link>
        </div>
      </div>
    </div>
  );
}
