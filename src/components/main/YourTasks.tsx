'use client';

import Panel from '@/components/ui/Panel';
import { useMemo, useState, useEffect, useRef, useCallback, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { useIsClient } from '@/hooks/useIsClient';
import { useMyTasks } from '@/features/tasks/hooks';
import type { TaskStatusSummary, UITask } from '@/features/tasks/types';
import { getTaskPriorityMeta } from '@/features/tasks/types';
import { getUserId, isAuthed } from '@/lib/auth';
import { fetchTaskBoardProject } from '@/features/tasks/api';
import { fetchProjectById } from '@/features/projects/api';
import { SkeletonTaskItem } from '@/components/ui/Skeleton';

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

  return `${day}.${month}.${year}`;
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

type StatusMeta = { label: string; color?: string };

const extractTaskStatusMeta = (task: UITask): StatusMeta | null => {
  const statuses: Array<TaskStatusSummary | string> = Array.isArray(task.statuses)
    ? task.statuses
    : [];
  const firstObject = statuses.find((status) => typeof status === 'object' && status);
  if (firstObject && typeof firstObject === 'object') {
    const summary = firstObject as TaskStatusSummary;
    const label = typeof summary.name === 'string' && summary.name.trim().length > 0
      ? summary.name.trim()
      : typeof summary.key === 'string' && summary.key.trim().length > 0
        ? summary.key.trim()
        : undefined;
    if (label) {
      return { label, color: summary.color };
    }
  }

  const firstString = statuses.find((status) => typeof status === 'string');
  if (typeof firstString === 'string' && firstString.trim().length > 0) {
    return { label: firstString.trim() };
  }

  return null;
};

const HEX_COLOR_REGEX = /^#([\da-f]{3}|[\da-f]{6})$/i;

const parseColor = (value: string): { r: number; g: number; b: number } | null => {
  const trimmed = value.trim();

  if (HEX_COLOR_REGEX.test(trimmed)) {
    const hex = trimmed.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((char) => `${char}${char}`).join('')
      : hex;
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return { r, g, b };
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    const [, rStr, gStr, bStr] = rgbMatch;
    return {
      r: Number.parseFloat(rStr),
      g: Number.parseFloat(gStr),
      b: Number.parseFloat(bStr),
    };
  }

  return null;
};

const asCssColor = ({ r, g, b }: { r: number; g: number; b: number }, alpha = 1) => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const clampAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${clamp(r)}, ${clamp(g)}, ${clamp(b)}, ${clampAlpha})`;
};


export default function YourTasks() {
    const isClient = useIsClient();
  const router = useRouter();
  const [resolvingTaskId, setResolvingTaskId] = useState<string | null>(null);
  const [taskProjects, setTaskProjects] = useState<Record<string, string | null>>({});
  const [autoResolvingMap, setAutoResolvingMap] = useState<Record<string, boolean>>({});
  const autoResolvingRef = useRef<Set<string>>(new Set());
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const projectFetchRef = useRef<Set<string>>(new Set());

    const hasCreds = isClient && isAuthed() && !!getUserId();
    const { data, isLoading, error } = useMyTasks(1, 20, hasCreds);
    const tasks = (data ?? []) as UITask[];
    const rememberProjectName = useCallback((projectId: string | undefined | null, name?: string | null) => {
        const trimmedId = typeof projectId === 'string' ? projectId.trim() : '';
        if (!trimmedId) return;
        const trimmedName = typeof name === 'string' ? name.trim() : '';
        if (!trimmedName) {
            return;
        }
        setProjectNames((prev) => {
            if (prev[trimmedId] === trimmedName) {
                return prev;
            }
            return {
                ...prev,
                [trimmedId]: trimmedName,
            };
        });
    }, []);
    const ensureProjectName = useCallback(async (projectId: string | undefined | null) => {
        const trimmedId = typeof projectId === 'string' ? projectId.trim() : '';
        if (!trimmedId) return;

        const known = projectNames[trimmedId];
        if (typeof known === 'string' && known.trim().length > 0) {
            if (!projectNames[trimmedId]) {
                rememberProjectName(trimmedId, known);
            }
            return;
        }

        if (projectFetchRef.current.has(trimmedId)) {
            return;
        }
        projectFetchRef.current.add(trimmedId);
        try {
            const project = await fetchProjectById(trimmedId);
            if (project?.name) {
                rememberProjectName(trimmedId, project.name);
            }
        } catch (err) {
            console.warn('Ваши задачи: не удалось получить данные проекта', trimmedId, err);
        } finally {
            projectFetchRef.current.delete(trimmedId);
        }
    }, [projectNames, rememberProjectName]);
    useEffect(() => {
        if (!Array.isArray(tasks) || tasks.length === 0) return;
        setProjectNames((prev) => {
            let next = prev;
            for (const task of tasks) {
                const rawId = typeof task.projectId === 'string' ? task.projectId.trim() : '';
                const rawName = typeof task.projectName === 'string' ? task.projectName.trim() : '';
                if (!rawId || !rawName) continue;
                if (next[rawId] === rawName) continue;
                if (next === prev) {
                    next = { ...prev };
                }
                next[rawId] = rawName;
            }
            return next === prev ? prev : next;
        });
    }, [tasks]);
    useEffect(() => {
        if (!Array.isArray(tasks) || tasks.length === 0) return;
        setTaskProjects((prev) => {
            let next = prev;
            for (const task of tasks) {
                const trimmedId = typeof task.projectId === 'string' ? task.projectId.trim() : '';
                if (!trimmedId) continue;
                if (next[task.id] === trimmedId) continue;
                if (next === prev) {
                    next = { ...prev };
                }
                next[task.id] = trimmedId;
            }
            return next === prev ? prev : next;
        });
    }, [tasks]);
    useEffect(() => {
        if (!hasCreds) return;
        if (!Array.isArray(tasks) || tasks.length === 0) return;

        const ids = new Set<string>();
        for (const task of tasks) {
            const immediate = extractLocationFromTask(task);
            const immediateId = typeof immediate.projectId === 'string' ? immediate.projectId.trim() : '';
            if (immediateId) ids.add(immediateId);
            const cached = taskProjects[task.id];
            const cachedId = typeof cached === 'string' ? cached.trim() : '';
            if (cachedId) ids.add(cachedId);
        }

        ids.forEach((id) => { void ensureProjectName(id); });
    }, [tasks, taskProjects, hasCreds, ensureProjectName]);

    // Подтягиваем проект/доску для задач, где API их не вернуло напрямую
    useEffect(() => {
      if (!hasCreds) return;
      if (!Array.isArray(tasks) || tasks.length === 0) return;

      const pendingTasks = tasks.filter((task) => {
        const immediate = extractLocationFromTask(task);
        if (typeof immediate.projectId === 'string' && immediate.projectId.trim().length > 0) {
          return false;
        }
        const cacheEntry = taskProjects[task.id];
        if (cacheEntry === null) return false;
        if (typeof cacheEntry === 'string' && cacheEntry.trim().length > 0) {
          return false;
        }
        if (autoResolvingRef.current.has(task.id)) return false;
        return true;
      });

      if (pendingTasks.length === 0) {
        return;
      }

      pendingTasks.forEach((task) => {
        autoResolvingRef.current.add(task.id);
      });
      setAutoResolvingMap((prev) => {
        if (pendingTasks.every((task) => prev[task.id])) {
          return prev;
        }
        const next = { ...prev };
        pendingTasks.forEach((task) => {
          next[task.id] = true;
        });
        return next;
      });

      let cancelled = false;

      const resolveProjects = async () => {
        for (const task of pendingTasks) {
          if (cancelled) break;
          try {
            const remote = await fetchTaskBoardProject(task.id);
            if (cancelled) break;
            const remoteProjectId = remote.projectId?.trim();
            if (remoteProjectId) {
              void ensureProjectName(remoteProjectId);
            }

            setTaskProjects((prev) => {
              const existing = prev[task.id];
              if (remoteProjectId) {
                if (existing === remoteProjectId) {
                  return prev;
                }
                return {
                  ...prev,
                  [task.id]: remoteProjectId,
                };
              }

              return existing === null
                ? prev
                : { ...prev, [task.id]: null };
            });
          } catch (err) {
            if (cancelled) break;
            setTaskProjects((prev) => (
              prev[task.id] === null
                ? prev
                : { ...prev, [task.id]: null }
            ));
          } finally {
            autoResolvingRef.current.delete(task.id);
            setAutoResolvingMap((prev) => {
              if (!prev[task.id]) return prev;
              const next = { ...prev };
              delete next[task.id];
              return next;
            });
          }
        }
      };

      void resolveProjects();

      return () => {
        cancelled = true;
        pendingTasks.forEach((task) => {
          autoResolvingRef.current.delete(task.id);
        });
        setAutoResolvingMap((prev) => {
          let mutated = false;
          const next = { ...prev };
          pendingTasks.forEach((task) => {
            if (next[task.id]) {
              mutated = true;
              delete next[task.id];
            }
          });
          return mutated ? next : prev;
        });
      };
    }, [hasCreds, tasks, taskProjects, ensureProjectName]);

    const handleTaskOpen = (task: UITask) => {
      router.push(`/tasks/${task.id}`);
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
          <div className="space-y-3 list-appear">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonTaskItem key={i} />)}
          </div>
        ) : error ? (
          <div className="text-center text-red-400 py-8">Ошибка загрузки задач</div>
        ) : sortedTasks.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            {tasks.length > 0
              ? 'Все ваши задачи уже в завершённых статусах — отличный результат!'
              : 'У вас пока нет задач'}
          </div>
        ) : (
          <div className="list-appear space-y-3">
            {hiddenCount > 0 && (
              <div className="text-xs text-emerald-200/80 px-1">
                Скрыто {hiddenCount} завершённых задач из списка «Ваши задачи»
              </div>
            )}
            {sortedTasks.map((t) => {
              const immediate = extractLocationFromTask(t);
              const resolvedProjectId = taskProjects[t.id];
              const rawProjectId = immediate.projectId ?? resolvedProjectId ?? undefined;
              const projectId = typeof rawProjectId === 'string' ? rawProjectId.trim() : rawProjectId;
              const isResolving = resolvingTaskId === t.id;
              const derivedProjectName = t.projectName
                ?? (typeof projectId === 'string' ? projectNames[projectId] : undefined);

              return (
                <TaskRow
                  key={t.id}
                  t={t}
                  resolving={isResolving}
                  projectId={projectId}
                  projectResolution={taskProjects[t.id]}
                  autoResolving={Boolean(autoResolvingMap[t.id])}
                  projectName={derivedProjectName}
                  onOpen={() => { void handleTaskOpen(t); }}
                />
              );
            })}
          </div>
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
  projectResolution,
  autoResolving,
  projectName,
}: {
  t: UITask;
  onOpen: () => void;
  resolving: boolean;
  projectId?: string;
  projectResolution: string | null | undefined;
  autoResolving: boolean;
  projectName?: string;
}) {
  const priorityMeta = getTaskPriorityMeta(t.priority);
  const hasLocation = Boolean(projectId);
  const statusMeta = extractTaskStatusMeta(t);
  const statusBadgeStyle = useMemo(() => {
    if (!statusMeta?.color) return undefined;
    const parsed = parseColor(statusMeta.color);
    if (!parsed) return undefined;
    return {
      color: '#f8fafc',
      backgroundColor: asCssColor(parsed, 0.24),
      boxShadow: `0 0 0 1px ${asCssColor(parsed, 0.45)}`,
    } satisfies CSSProperties;
  }, [statusMeta?.color]);
  const statusBadgeClassName = [
    'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold text-white',
    statusBadgeStyle ? 'ring-1 ring-white/20' : 'ring-1 ring-slate-500/50 bg-slate-700/40',
  ].join(' ').trim();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!resolving) {
        onOpen();
      }
    }
  };
  const normalizedProjectId = typeof projectId === 'string' ? projectId.trim() : projectId;
  let projectLabel: string | undefined = projectName;

  if (!projectLabel) {
    if (resolving || autoResolving || normalizedProjectId) {
      projectLabel = 'Определяем проект…';
    } else if (projectResolution === null) {
      projectLabel = 'Проект не найден';
    }
  }

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
        <div className="flex-1 min-w-0">
          <div className="font-semibold">{t.title}</div>
          {projectLabel && (
            <div className="text-slate-200 text-sm mt-0.5">
              Проект: {projectLabel}
            </div>
          )}
          {t.due && (
            <div className="text-slate-400 text-sm mt-0.5">
              Срок: {formatDueDate(t.due)}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs ring-1 ${priorityMeta.badgeClass}`}>
            {priorityMeta.label}
          </span>
          {statusMeta && (
            <span
              className={statusBadgeClassName}
              style={statusBadgeStyle}
            >
              {statusMeta.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
