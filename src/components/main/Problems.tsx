'use client';

import Panel from '@/components/ui/Panel';
import { useMyProblems } from '@/features/problems/hooks';
import {getUserId, isAuthed} from "@/lib/auth";
import { useIsClient } from '@/hooks/useIsClient';
import type {UIProblem} from "@/features/problems/api";

export type Problem = {
  id: string;
  title: string;
  when: string;
  status?: 'open' | 'inprogress' | 'done';
};

export default function Problems({ items }: { items: Problem[] }) {
    const isClient = useIsClient();

    const hasCreds = isClient && isAuthed();
    const { data, isLoading, error } = useMyProblems(1, 20, hasCreds);
    const problems = (data ?? []) as UIProblem[];
  return (
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Проблемы</h2>
      </div>

      <div className="flex-1 min-h-0">
        {problems.length ? (
          <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
            {problems.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10 px-4 py-2"
              >
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-slate-400 text-sm">{p.updated}</div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full place-items-center text-slate-400">
            Похоже, проблем нет
          </div>
        )}
      </div>
    </Panel>
  );
}

function StatusBadge({ status }: { status: 'open' | 'inprogress' | 'done' }) {
  const map = {
    open: ['Открыта', 'bg-rose-500/20 text-rose-200 ring-rose-400/40'],
    inprogress: ['В работе', 'bg-amber-500/20 text-amber-200 ring-amber-400/40'],
    done: ['Решена', 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/40'],
  } as const;
  const [label, cls] = map[status];
  return <span className={`rounded-lg px-2 py-1 text-sm ring-1 ${cls}`}>{label}</span>;
}
