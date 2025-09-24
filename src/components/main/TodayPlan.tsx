'use client';

import Panel from '@/components/ui/Panel';

export type PlanItem = {
  id: string;
  task: string;
  subtask?: string;
  text?: string;
};

export default function TodayPlan({ items }: { items: PlanItem[] }) {
  return (
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">План из вашего прошлого отчета</h2>
      </div>

      <div className="flex-1 min-h-0">
        {items.length ? (
          <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
            {items.map((p) => (
              <li
                key={p.id}
                className="rounded-xl px-4 py-2  backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <div className="font-medium">{p.task}</div>
                  {p.subtask && (
                    <span className="text-s rounded-lg px-5 py-0.5 ring-1 bg-emerald-500/10 text-emerald-300">
                      {p.subtask}
                    </span>
                  )}
                </div>
                {p.text && (
                  <div className="text-slate-400 text-sm mt-0.5">{p.text}</div>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full place-items-center rounded-xl bg-[#141c2f] ring-1 ring-white/10 text-slate-400">
            Вы не составили план в прошлом отчете
          </div>
        )}
      </div>
    </Panel>
  );
}
