'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type ConfirmCtx = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const Ctx = createContext<ConfirmCtx | null>(null);

type PendingConfirm = ConfirmOptions & { resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => {
      setPending({ ...opts, resolve });
    });
  }, []);

  const handle = (value: boolean) => {
    pending?.resolve(value);
    setPending(null);
  };

  return (
    <Ctx.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
             onClick={() => handle(false)}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl"
            style={{ background: 'rgba(15,25,18,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}>
            {pending.title && (
              <h3 className="font-semibold text-white text-base">{pending.title}</h3>
            )}
            <p className="text-sm text-slate-300 leading-relaxed">{pending.message}</p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => handle(false)}
                className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                {pending.cancelLabel ?? 'Отмена'}
              </button>
              <button
                onClick={() => handle(true)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  pending.danger
                    ? 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30'
                }`}>
                {pending.confirmLabel ?? 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useConfirm(): ConfirmCtx['confirm'] {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useConfirm must be inside ConfirmProvider');
  return ctx.confirm;
}
