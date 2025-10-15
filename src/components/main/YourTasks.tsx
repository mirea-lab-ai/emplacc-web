'use client';

import Panel from '@/components/ui/Panel';
import { useMemo } from 'react';
import { useIsClient } from '@/hooks/useIsClient';
import { useMyTasks } from '@/features/tasks/hooks';
import type { UITask } from '@/features/tasks/types';
import { getTaskPriorityMeta } from '@/features/tasks/types';
import { getUserId, isAuthed } from '@/lib/auth';

const CLOSED_STATUS_KEYWORDS = ['done', 'completed', 'готов', 'закрыт', 'выполн'];

const isTaskClosed = (task: UITask) => {
  if (!Array.isArray(task.statuses) || task.statuses.length === 0) {
    return false;
  }

  return task.statuses.some((statusName) => {
    if (typeof statusName !== 'string') return false;
    const normalized = statusName.trim().toLowerCase();
    if (!normalized) return false;
    return CLOSED_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
  });
};

const formatDueDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export default function YourTasks() {
    const isClient = useIsClient();

    const hasCreds = isClient && isAuthed() && !!getUserId();
    const { data, isLoading, error } = useMyTasks(1, 20, hasCreds);
    const tasks = (data ?? []) as UITask[];

    const { sortedTasks, hiddenCount } = useMemo(() => {
      const openTasks: UITask[] = [];
      let hidden = 0;

      for (const task of tasks) {
        if (isTaskClosed(task)) {
          hidden += 1;
          continue;
        }
        openTasks.push(task);
      }

      openTasks.sort((a, b) => {
        return getTaskPriorityMeta(a.priority).order - getTaskPriorityMeta(b.priority).order;
      });

      return { sortedTasks: openTasks, hiddenCount: hidden };
    }, [tasks]);
    if (!isClient) {
        return (
            <Panel className="p-6 h-[680px] overflow-hidden t-surface">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold">Ваши задачи</h2>
                </div>
                <div className="h-[calc(100%-2.5rem)] overflow-y-auto pr-2 custom-scroll space-y-3">
                </div>
            </Panel>
        );
    }
  return (
    <Panel className="p-6 h-[680px] overflow-hidden t-surface">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Ваши задачи</h2>
      </div>

      <div className="h-[calc(100%-2.5rem)] overflow-y-auto pr-2 custom-scroll space-y-3">
        {isLoading ? (
          <div className="text-center text-slate-400 py-8">Загрузка задач...</div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">Ошибка загрузки задач</div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            {tasks.length > 0
              ? 'Все ваши задачи уже в завершённых статусах — отличный результат!'
              : 'У вас пока нет задач'}
          </div>
        ) : (
          <>
            {hiddenCount > 0 && (
              <div className="text-xs text-emerald-200/80 px-1">
                Скрыто {hiddenCount} завершённых задач из списка «Ваши задачи»
              </div>
            )}
            {sortedTasks.map((t) => (
              <TaskRow key={t.id} t={t} />
            ))}
          </>
        )}
      </div>
    </Panel>
  );
}

function TaskRow({t}: { t: UITask }) {
  const priorityMeta = getTaskPriorityMeta(t.priority);

  return (
    <div className="relative overflow-hidden rounded-2xl p-4 ring-1 ring-white/10 px-4 py-2 backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
      <div className="relative z-[1] flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{t.title}</div>
          {t.due && (
            <div className="text-slate-400 text-sm mt-0.5">
              Срок: {formatDueDate(t.due)}
            </div>
          )}
        </div>
        <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs ring-1 ${priorityMeta.badgeClass}`}>
          {priorityMeta.label}
        </span>
      </div>
    </div>
  );
}
