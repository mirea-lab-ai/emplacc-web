'use client';

import Panel from '@/components/ui/Panel';
import { useMemo } from 'react';

export type Task = {
  id: string;
  title: string;
  next?: string;
  urgent?: boolean;   // пометка «срочно»
  severity?: number;  // 1..5 (5 — очень срочно)
  due?: string;       // «сегодня», «завтра»…
};

export default function YourTasks({ tasks }: { tasks: Task[] }) {
  // срочные первыми, затем по убыванию severity
  const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      const u = Number(!!b.urgent) - Number(!!a.urgent);
      if (u !== 0) return u;
      return (b.severity ?? 0) - (a.severity ?? 0);
    });
    return arr;
  }, [tasks]);

  return (
    <Panel className="p-6 h-[680px] overflow-hidden">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ваши задачи</h2>
      </div>

      <div className="h-[calc(100%-2.5rem)] overflow-y-auto pr-2 custom-scroll space-y-3">
        {sorted.map((t) => (
          <TaskRow key={t.id} t={t}/>
        ))}
      </div>
    </Panel>
  );
}

function TaskRow({t}: { t: Task }) {
  const badge =
    t.urgent
      ? 'bg-rose-500/20 text-rose-200 ring-rose-400/40'
      : 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/40';

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 ring-1 ring-white/10 bg-[#141c2f] hover:bg-[#16213a] transition-colors">
      {t.urgent && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-rose-600/30 via-rose-500/20 to-transparent" />
      )}
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{t.title}</div>
          {t.next && <div className="text-slate-300">Следующее: {t.next}</div>}
          {t.due && <div className="text-slate-400 text-sm mt-0.5">Срок: {t.due}</div>}
        </div>
        <span className={`rounded-lg px-2 py-0.5 text-xs ring-1 ${badge}`}>
          {t.urgent ? `Срочно ${t.severity ?? ''}` : `Приоритет ${t.severity ?? 1}`}
        </span>
      </div>
    </div>
  );
}
