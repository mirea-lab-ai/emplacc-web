'use client';

import Panel from '@/components/ui/Panel';
import { useMemo } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { useMyTasks } from '@/features/tasks/hooks';
import type { UITask } from '@/features/tasks/types';
import {getUserId, isAuthed} from "@/lib/auth";

export default function YourTasks() {
    const isClient = useIsClient();

    const hasCreds = isClient && isAuthed() && !!getUserId();
    const { data, isLoading, error } = useMyTasks(1, 20, hasCreds);
    const tasks = (data ?? []) as UITask[];

    const sorted = useMemo(() => {
    const arr = [...tasks];
    arr.sort((a, b) => {
      return (b.priority ?? 0) - (a.priority ?? 0);
    });
    return arr;
  }, [tasks]);
    if (!isClient) {
        return (
            <Panel className="p-6 h-[680px] overflow-hidden backdrop-blur-md bg-white/5 border border-white/10">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Ваши задачи</h2>
                </div>
                <div className="h-[calc(100%-2.5rem)] overflow-y-auto pr-2 custom-scroll space-y-3">
                </div>
            </Panel>
        );
    }
  return (
    <Panel className="p-6 h-[680px] overflow-hidden backdrop-blur-md bg-white/5 border border-white/10">
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

function TaskRow({t}: { t: UITask }) {

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 ring-1 ring-white/10 px-4 py-2 backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{t.title}</div>
          {t.due && <div className="text-slate-400 text-sm mt-0.5">Срок: {t.due}</div>}
        </div>
        <span className={`rounded-lg px-2 py-0.5 text-xs ring-1`}>
          {`Приоритет ${t.priority ?? 1}`}
        </span>
      </div>
    </div>
  );
}
