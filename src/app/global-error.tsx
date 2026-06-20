'use client';

import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <html lang="ru">
      <body style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#0a160e', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
        <div style={{ textAlign: 'center', maxWidth: 360, padding: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: '#fff', marginBottom: 8 }}>Приложение не загрузилось</h2>
          <p style={{ opacity: 0.7, marginBottom: 20 }}>Произошла критическая ошибка. Попробуйте перезагрузить страницу.</p>
          <button
            onClick={reset}
            style={{ padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(to bottom right,#34d399,#a3e635)', color: '#000', fontWeight: 600 }}
          >
            Повторить
          </button>
        </div>
      </body>
    </html>
  );
}
