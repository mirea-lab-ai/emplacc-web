'use client';

import Panel from '@/components/ui/Panel';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import { useMyTasks } from '@/features/tasks/hooks';
import type { TaskStatusSummary, UITask } from '@/features/tasks/types';
import { getTaskPriorityMeta } from '@/features/tasks/types';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchTaskBoardProject } from '@/features/tasks/api';

const CLOSED_STATUS_KEYWORDS = ['done', 'completed', 'готов', 'закрыт', 'выполн'];

const isTaskClosed = (task: UITask) => {
  if (!Array.isArray(task.statuses) || task.statuses.length === 0) {
    return false;
  }

  return task.statuses.some((status) => isStatusClosed(status));
};

const isStatusClosed = (status: TaskStatusSummary | string | undefined | null): boolean => {
  if (status == null) return false;

  if (typeof status === 'string') {
    const normalized = status.trim().toLowerCase();
    if (!normalized) return false;
    return CLOSED_STATUS_KEYWORDS.some((keyword) => normalized.includes(keyword));
  }

  if (status.isOpen === false) return true;
  if (status.isActive === false) return true;

  const candidates = [status.name, status.key];
  return candidates.some((value) => {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();
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

const extractLocationFromTask = (task: UITask) => {
  const projectId = task.projectId
    ?? (Array.isArray(task.statuses)
      ? task.statuses.find((status) => typeof status === 'object' && status?.projectId)?.projectId
      : undefined);

  const boardId = task.boardId
    ?? (Array.isArray(task.statuses)
      ? task.statuses.find((status) => typeof status === 'object' && status?.boardId)?.boardId
      : undefined);

  return { projectId, boardId };
};

export default function YourTasks() {
    const isClient = useIsClient();
  const router = useRouter();
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);
  const [resolvedLocations, setResolvedLocations] = useState<Record<string, { projectId: string; boardId?: string } | null>>({});

    const hasCreds = isClient && isAuthed() && !!getUserId();
    const { data, isLoading, error } = useMyTasks(1, 20, hasCreds);
    const tasks = (data ?? []) as UITask[];

    const navigateToBoard = (projectId: string, boardId?: string) => {
      const params = new URLSearchParams();
      params.set('projectId', projectId);
      params.set('tab', 'board');
      if (boardId) {
        params.set('boardId', boardId);
      }
      router.push(`/projects?${params.toString()}`);
    };

    const handleTaskOpen = async (task: UITask) => {
      const immediate = extractLocationFromTask(task);
      const cached = resolvedLocations[task.id];

      if (cached === null) {
        console.warn('Ваши задачи: ранее не удалось определить проект для задачи', task.id);
        return;
      }

      const projectId = immediate.projectId ?? cached?.projectId;
      const boardId = immediate.boardId ?? cached?.boardId;

      if (projectId) {
        setResolvedLocations((prev) => {
          const existing = prev[task.id];
          if (existing && existing.projectId === projectId && existing.boardId === boardId) {
            return prev;
          }
          return {
            ...prev,
            [task.id]: { projectId, boardId },
          };
        });
        navigateToBoard(projectId, boardId);
        return;
      }

      if (resolvingTaskId === task.id) {
        return;
      }

      setResolvingTaskId(task.id);

      try {
        const remote = await fetchTaskBoardProject(task.id);
        const resolvedProjectId = remote.projectId ?? immediate.projectId ?? cached?.projectId;
        const resolvedBoardId = remote.boardId ?? immediate.boardId ?? cached?.boardId;

        if (resolvedProjectId) {
          setResolvedLocations((prev) => {
            const existing = prev[task.id];
            if (existing && existing.projectId === resolvedProjectId && existing.boardId === resolvedBoardId) {
              return prev;
            }
            return {
              ...prev,
              [task.id]: { projectId: resolvedProjectId, boardId: resolvedBoardId },
            };
          });
          navigateToBoard(resolvedProjectId, resolvedBoardId);
          return;
        }

        console.warn('Ваши задачи: не удалось определить проект для перехода', task, remote);
        setResolvedLocations((prev) => (
          prev[task.id] === null
            ? prev
            : { ...prev, [task.id]: null }
        ));
      } catch (err) {
        console.error('Ваши задачи: ошибка при определении доски задачи', err);
        setResolvedLocations((prev) => (
          prev[task.id] === null
            ? prev
            : { ...prev, [task.id]: null }
        ));
      } finally {
        setResolvingTaskId((current) => (current === task.id ? null : current));
      }
    };

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
            {sortedTasks.map((t) => {
              const immediate = extractLocationFromTask(t);
              const cached = resolvedLocations[t.id];
              const projectId = immediate.projectId ?? cached?.projectId;
              const boardId = immediate.boardId ?? cached?.boardId;
              const isResolving = resolvingTaskId === t.id;

              return (
                <TaskRow
                  key={t.id}
                  t={t}
                  resolving={isResolving}
                  projectId={projectId}
                  boardId={boardId}
                  onOpen={() => { void handleTaskOpen(t); }}
                />
              );
            })}
          </>
        )}
      </div>
    </Panel>
  );
}

function TaskRow({
  t,
  onOpen,
  resolving,
  projectId,
  boardId,
}: {
  t: UITask;
  onOpen: () => void;
  resolving: boolean;
  projectId?: string;
  boardId?: string;
}) {
  const priorityMeta = getTaskPriorityMeta(t.priority);
  const hasLocation = Boolean(projectId);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!resolving) {
        onOpen();
      }
    }
  };

  return (
    <div
  role="button"
  tabIndex={0}
  onClick={resolving ? undefined : onOpen}
  onKeyDown={handleKeyDown}
      aria-disabled={resolving}
      aria-busy={resolving}
      title={hasLocation ? 'Открыть доску с этой задачей' : 'Определяем доску задачи'}
      className={[
        'relative overflow-hidden rounded-2xl ring-1 ring-white/10 px-4 py-2 backdrop-blur-sm border border-white/20 text-white transition-colors bg-white/10 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300',
        resolving ? 'pointer-events-none opacity-60' : 'hover:bg-white/20',
      ].join(' ')}
    >
      {resolving && (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-slate-900/40 text-xs text-slate-200">
          Открываем доску…
        </div>
      )}
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
