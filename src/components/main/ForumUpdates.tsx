'use client';

import Panel from '@/components/ui/Panel';
import Link from 'next/link';
import { useAllProblems } from '@/features/problems/hooks';
import { getUserId, isAuthed } from "@/lib/auth";
import { useIsClient } from '@/hooks/useIsClient';
import type { UIProblem } from "@/features/problems/api";

export type ForumNote = {
  id: string;
  topic: string;
  text: string;
  href?: string;
};

export default function ForumUpdates() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data, isLoading, error } = useAllProblems(1, 10, hasCreds);
  const problems = (data ?? []) as UIProblem[];
  return (
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">Форум</h2>
      </div>

      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="grid h-full place-items-center text-slate-400">
            Загрузка проблем...
          </div>
        ) : error ? (
          <div className="grid h-full place-items-center text-red-400">
            Ошибка загрузки проблем
          </div>
        ) : problems.length ? (
          <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
            {problems.map((problem) => (
              <li
                key={problem.id}
                className="rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10 px-4 py-2"
              >
                <Link href={`/forum?problem=${problem.id}`}>
                  <div className="font-semibold">{problem.name}</div>
                  {problem.description && (
                    <div className="text-slate-400 text-sm line-clamp-2">
                      {problem.description}
                    </div>
                  )}
                  <div className="text-slate-400 text-xs mt-1">
                    {problem.createdAt ? new Date(problem.createdAt).toLocaleDateString() : ''}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full place-items-center rounded-xl bg-[#141c2f] ring-1 ring-white/10 text-slate-400">
            Проблем пока нет
          </div>
        )}
      </div>
    </Panel>
  );
}
