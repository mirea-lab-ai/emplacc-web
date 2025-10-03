'use client';

import Panel from '@/components/ui/Panel';
import { useEffect, useMemo, useState } from 'react';
import { fetchMyHelpRequests, UIHelpRequest } from '@/features/reports/api';
import { isAuthed, getUserId } from '@/lib/auth';

export type HelpReq = {
  id: string;
  from: string;
  task: string;
  text?: string;
};

export default function HelpRequests() {
  const [i, setI] = useState(0);
  const [fetched, setFetched] = useState<UIHelpRequest[]>([]);
  useEffect(() => {
    if (!isAuthed() || !getUserId()) return;
    fetchMyHelpRequests().then(setFetched).catch(() => setFetched([]));
  }, []);
  const list: HelpReq[] = useMemo(() => {
    return fetched.map((r) => ({ id: r.id, from: r.authorName ?? 'Пользователь', task: r.task ?? 'Задача', text: r.description }));
  }, [fetched]);
  const has = list.length > 0;

  return (
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Просьбы о помощи</h2>
        {has && (
          <div className="flex items-center gap-2">
            <button
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-3 py-1.5 font-bold text-black hover:brightness-110"
              onClick={() => setI((i - 1 + list.length) % list.length)}
              aria-label="Назад"
            >
              ←
            </button>
            <button
              className="rounded-xl bg-gradient-to-br font-bold from-emerald-500 to-lime-400 px-3 py-1.5 text-black hover:brightness-110"
              onClick={() => setI((i + 1) % list.length)}
              aria-label="Вперёд"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {!has ? (
          <div className="grid h-full place-items-center rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 ring-1 ring-white/10 text-slate-400">
            Вас никто не просил о помощи
          </div>
        ) : (
          <div className="h-full rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10 p-3 text-sm overflow-auto custom-scroll">
            <div className="text-slate-300">Просит:</div>
            <div className="font-semibold">{list[i].from}</div>
            <div className="mt-1 text-slate-300">По задаче:</div>
            <div className="font-medium">{list[i].task}</div>
            {list[i].text && (
              <div className="mt-1 text-slate-400">{list[i].text}</div>
            )}
          </div>
        )}
      </div>
    </Panel>
  );
}
