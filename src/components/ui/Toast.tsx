'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: number;
  message: string;
  type: ToastType;
  leaving?: boolean;
};

type ToastCtx = {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
  warning: (message: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);
let _counter = 0;

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
  warning: '⚠',
};
const COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-500/15 ring-emerald-500/30 text-emerald-200',
  error:   'bg-red-500/15    ring-red-500/30    text-red-200',
  info:    'bg-blue-500/15   ring-blue-500/30   text-blue-200',
  warning: 'bg-amber-500/15  ring-amber-500/30  text-amber-200',
};
const ICON_COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-500/30 text-emerald-300',
  error:   'bg-red-500/30    text-red-300',
  info:    'bg-blue-500/30   text-blue-300',
  warning: 'bg-amber-500/30  text-amber-300',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts(ts => ts.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 300);
  }, []);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_counter;
    setToasts(ts => [...ts, { id, message, type }]);
    setTimeout(() => dismiss(id), 4000);
    return id;
  }, [dismiss]);

  const ctx: ToastCtx = {
    toast,
    success: (m) => toast(m, 'success'),
    error:   (m) => toast(m, 'error'),
    info:    (m) => toast(m, 'info'),
    warning: (m) => toast(m, 'warning'),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-3',
              'backdrop-blur-md ring-1 shadow-xl min-w-[240px] max-w-[380px]',
              COLORS[t.type],
              t.leaving ? 'animate-toast-out' : 'animate-toast-in',
            ].join(' ')}
          >
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-sm font-bold ${ICON_COLORS[t.type]}`}>
              {ICONS[t.type]}
            </span>
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none">
              ×
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): ToastCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be inside ToastProvider');
  return ctx;
}
