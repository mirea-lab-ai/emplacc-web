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

// Мост для показа ошибок из мест вне React-дерева (например, глобальный onError React Query).
let _externalError: ((message: string) => void) | null = null;
export function notifyGlobalError(message: string) {
  _externalError?.(message);
}

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

// Дольше показываем ошибки/предупреждения — их нужно успеть прочитать.
function toastDuration(type: ToastType): number {
  return type === 'error' || type === 'warning' ? 6500 : 4000;
}

type TimerState = { handle: ReturnType<typeof setTimeout>; remaining: number; start: number };

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, TimerState>>(new Map());

  const dismiss = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t.handle); timers.current.delete(id); }
    setToasts(ts => ts.map(x => x.id === id ? { ...x, leaving: true } : x));
    setTimeout(() => setToasts(ts => ts.filter(x => x.id !== id)), 300);
  }, []);

  const arm = useCallback((id: number, ms: number) => {
    const handle = setTimeout(() => dismiss(id), ms);
    timers.current.set(id, { handle, remaining: ms, start: Date.now() });
  }, [dismiss]);

  // Пауза при наведении/фокусе, чтобы тост не исчез пока пользователь читает/наводит мышь.
  const pause = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t) return;
    clearTimeout(t.handle);
    t.remaining = Math.max(0, t.remaining - (Date.now() - t.start));
  }, []);

  const resume = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (!t) return;
    t.start = Date.now();
    t.handle = setTimeout(() => dismiss(id), t.remaining);
  }, [dismiss]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = ++_counter;
    setToasts(ts => [...ts, { id, message, type }]);
    arm(id, toastDuration(type));
    return id;
  }, [arm]);

  const ctx: ToastCtx = {
    toast,
    success: (m) => toast(m, 'success'),
    error:   (m) => toast(m, 'error'),
    info:    (m) => toast(m, 'info'),
    warning: (m) => toast(m, 'warning'),
  };

  // Регистрируем error-тост как глобальный обработчик (для React Query onError и т.п.).
  useEffect(() => {
    _externalError = (m: string) => toast(m, 'error');
    return () => { _externalError = null; };
  }, [toast]);

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div
        className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
        role="region"
        aria-live="polite"
        aria-label="Уведомления"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
            aria-atomic="true"
            onMouseEnter={() => pause(t.id)}
            onMouseLeave={() => resume(t.id)}
            onFocus={() => pause(t.id)}
            onBlur={() => resume(t.id)}
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
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Закрыть уведомление"
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-lg leading-none">
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
