'use client';

import Panel from '@/components/ui/Panel';
import Link from 'next/link';
import { useAllProblems } from '@/features/problems/hooks';
import { isAuthed } from "@/lib/auth";
import { useIsClient } from '@/hooks/useIsClient';
import type { UIProblem } from "@/features/problems/api";
import { SkeletonForumItem } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/date';

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
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonForumItem key={i} />)}
          </div>
        ) : error ? (
          <div className="grid h-full place-items-center text-red-400">
            Ошибка загрузки проблем
          </div>
        ) : problems.length ? (
          <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll list-appear">
            {problems.map((problem) => (
              <li
                key={problem.id}
                className="rounded-xl backdrop-blur-sm bg-app-hover border border-app text-app hover:bg-app-hover ring-1 ring-app px-4 py-2"
              >
                <Link href={`/forum?problem=${problem.id}`}>
                  <div className="font-semibold">{problem.name}</div>
                  {problem.description && (
                    <div className="text-app-2 text-sm line-clamp-2">
                      {problem.description}
                    </div>
                  )}
                  <div className="text-app-2 text-xs mt-1">
                    {formatDate(problem.createdAt)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="grid h-full place-items-center rounded-xl backdrop-blur-sm bg-app-hover border border-app ring-1 ring-app text-app-2">
            Проблем пока нет
          </div>
        )}
      </div>
    </Panel>
  );
}
