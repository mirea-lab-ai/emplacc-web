'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Panel from '@/components/ui/Panel';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { useAllTasks, useDeleteTask } from '@/features/tasks/hooks';
import { useToast } from '@/components/ui/Toast';
import { getTaskPriorityMeta } from '@/features/tasks/types';
import Avatar from '@/components/ui/Avatar';

const PAGE_SIZE = 25;

export default function TasksPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading, isError, refetch } = useAllTasks(page, PAGE_SIZE);
  const deleteTask = useDeleteTask();
  const toast = useToast();

  const tasks  = data?.tasks ?? [];
  const total  = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return tasks;
    return tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q) ||
      (t.projectName ?? '').toLowerCase().includes(q)
    );
  }, [tasks, search]);

  async function handleDelete(taskId: string, title: string) {
    if (!confirm(`Удалить задачу «${title}»?`)) return;
    try {
      await deleteTask.mutateAsync(taskId);
      toast.success(`Задача «${title}» удалена`);
      refetch();
    } catch {
      toast.error('Не удалось удалить задачу');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel className="px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold">Задачи</h1>
            <p className="text-slate-400 text-sm mt-0.5">Всего: {total}</p>
          </div>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по задаче…"
            className="w-full sm:w-64 rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-emerald-500/50"
          />
        </div>
      </Panel>

      <Panel className="p-0 overflow-hidden">
        {isLoading && (
          <div className="divide-y divide-white/5">
            {Array.from({length: 8}).map((_,i) => <SkeletonRow key={i}/>)}
          </div>
        )}
        {isError   && <div className="py-12 text-center text-red-400">Не удалось загрузить задачи</div>}
        {!isLoading && !isError && filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">Задачи не найдены</div>
        )}
        {!isLoading && !isError && filtered.length > 0 && (
          <div className="divide-y divide-white/5 list-appear">
            {filtered.map(task => {
              const priority = getTaskPriorityMeta(task.priority);
              const assignee = task.assignees?.[0];
              const status   = task.statuses?.[0];
              return (
                <div key={task.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors">
                  <div className="flex-1 min-w-0">
                    <Link href={`/tasks/${task.id}`} className="font-medium truncate hover:text-emerald-300 transition-colors block">
                      {task.title}
                    </Link>
                    {task.projectName && <div className="text-xs text-slate-500 mt-0.5 truncate">{task.projectName}</div>}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full ring-1 font-medium ${priority.badgeClass}`}>
                      {priority.label}
                    </span>
                    {status?.name && (
                      <span className="hidden md:inline-flex text-xs px-2 py-0.5 rounded-full ring-1 ring-white/10 bg-white/5">
                        {status.name}
                      </span>
                    )}
                    {task.due && (
                      <span className="hidden lg:inline text-xs text-slate-500">
                        {new Date(task.due).toLocaleDateString('ru-RU')}
                      </span>
                    )}
                    {assignee && (
                      <Avatar name={assignee.name ?? ''} email={assignee.email} url={assignee.avatar} fallbackKey={assignee.id ?? task.id} size="sm" />
                    )}
                    <button
                      onClick={() => handleDelete(task.id, task.title)}
                      disabled={deleteTask.isPending}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Удалить задачу"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-2 6a1 1 0 112 0v4a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v4a1 1 0 11-2 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      {totalPages > 1 && !search && (
        <Panel className="px-6 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40">
              ← Назад
            </button>
            <span className="text-sm text-slate-400">Страница {page} из {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:text-white disabled:opacity-40">
              Вперёд →
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
}
