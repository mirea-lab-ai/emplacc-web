'use client';

import { useMemo, useState, useEffect, useCallback, type KeyboardEvent } from 'react';
import { useAllUserProjects } from '@/features/projects/hooks';
import { useProjectBoards } from '@/features/boards/hooks';
import { useBoardTasksByProjectAndBoard } from '@/features/tasks/hooks';
import { isAuthed } from '@/lib/auth';
import { getTaskPriorityMeta, type TaskAssignee } from '@/features/tasks/types';

const HEX_COLOR_REGEX = /^#([\da-f]{3}|[\da-f]{6})$/i;

const parseColor = (value: string): { r: number; g: number; b: number } | null => {
  const trimmed = value.trim();

  if (HEX_COLOR_REGEX.test(trimmed)) {
    const hex = trimmed.slice(1);
    const normalized = hex.length === 3
      ? hex.split('').map((char) => `${char}${char}`).join('')
      : hex;
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);
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

const formatDueDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();

  return `${day}.${month}.${year}`;
};

const normalize = (value: string | undefined | null) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export type TaskInfo = {
  taskId?: string;
  boardId?: string;
  projectId?: string;
  due?: string;
  taskTitle: string;
  boardName: string;
  projectName: string;
  statusName?: string;
  statusColor?: string;
  priority?: number;
  assignees?: TaskAssignee[];
  description?: string;
  creatorName?: string;
  creatorEmail?: string;
};

const taskInfoMatchesQuery = (info: TaskInfo, normalizedQuery: string) => {
  if (!normalizedQuery) return true;
  const haystack: string[] = [];

  if (info.taskTitle) haystack.push(info.taskTitle);
  if (info.projectName) haystack.push(info.projectName);
  if (info.boardName) haystack.push(info.boardName);

  if (Array.isArray(info.assignees)) {
    for (const assignee of info.assignees) {
      if (assignee?.name) haystack.push(assignee.name);
      if (assignee?.email) haystack.push(assignee.email);
      if (assignee?.id) haystack.push(assignee.id);
    }
  }

  return haystack.some((value) => normalize(value).includes(normalizedQuery));
};

export type ReportProjectPickerProps = {
  selected: Set<string>; // ключ `${boardId}:${taskId}`
  onToggle: (boardId: string, taskId: string) => void;
  onTaskInfoUpdate?: (taskMap: Map<string, TaskInfo>) => void;
  title: string;
  description?: string;
};

export default function ReportProjectPicker({
  selected,
  onToggle,
  onTaskInfoUpdate,
  title,
  description,
}: ReportProjectPickerProps) {
  const hasCreds = isAuthed();
  const { data: projects, isLoading: projectsLoading } = useAllUserProjects(hasCreds);
  const [allTaskInfo, setAllTaskInfo] = useState<Map<string, TaskInfo>>(new Map());
  const [boardLoading, setBoardLoading] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');

  const handleBoardTasksUpdate = useCallback((boardId: string, tasks: Map<string, TaskInfo>) => {
    setAllTaskInfo((prev) => {
      const next = new Map(prev);
      const prefix = `${boardId}:`;
      for (const key of Array.from(next.keys())) {
        if (key.startsWith(prefix)) {
          next.delete(key);
        }
      }
      tasks.forEach((value, key) => {
        next.set(key, value);
      });
      return next;
    });
  }, []);

  const handleBoardLoadingChange = useCallback((id: string, isLoading: boolean) => {
    setBoardLoading((prev) => {
      const next = new Set(prev);
      if (isLoading) {
        if (next.has(id)) return prev;
        next.add(id);
        return next;
      }
      if (!next.has(id)) return prev;
      next.delete(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (onTaskInfoUpdate) {
      onTaskInfoUpdate(allTaskInfo);
    }
  }, [allTaskInfo, onTaskInfoUpdate]);

  const normalizedQuery = searchTerm.trim().toLowerCase();

  const taskList = useMemo(() => {
    const entries = Array.from(allTaskInfo.entries()).map(([key, info]) => ({
      key,
      info,
      priorityOrder: getTaskPriorityMeta(info.priority).order,
      titleForSort: normalize(info.taskTitle),
    }));
    entries.sort((a, b) => {
      if (a.priorityOrder !== b.priorityOrder) {
        return a.priorityOrder - b.priorityOrder;
      }
      return a.titleForSort.localeCompare(b.titleForSort);
    });
    return entries;
  }, [allTaskInfo]);

  const filteredTasks = useMemo(() => {
    if (!normalizedQuery) return taskList;
    return taskList.filter(({ info }) => taskInfoMatchesQuery(info, normalizedQuery));
  }, [taskList, normalizedQuery]);

  const isLoadingTasks = boardLoading.size > 0;
  const hasTasks = taskList.length > 0;

  if (projectsLoading) {
    return (
      <section className="flex flex-col justify-start">
        <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
        {description && <p className="text-app-2 mb-4">{description}</p>}
        <div className="text-app-2">Загрузка проектов…</div>
      </section>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <section className="flex flex-col justify-start">
        <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
        {description && <p className="text-app-2 mb-4">{description}</p>}
        <div className="text-app-2">Нет доступных проектов</div>
      </section>
    );
  }

  return (
    <>
      <section className="flex flex-col justify-start">
        <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
        {description && <p className="text-app-2 mb-4">{description}</p>}

        <div className="mb-5">
          <label className="flex flex-col gap-2 text-sm text-app-2">
            <span className="font-medium text-app">Поиск по задачам</span>
            <div className="relative">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Введите название задачи, проекта или исполнителя"
                className="w-full rounded-xl border border-app bg-black/30 px-4 py-2 text-sm text-app placeholder:text-app-3 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                type="search"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 px-3 text-xs text-emerald-200 hover:text-emerald-100"
                >
                  Очистить
                </button>
              )}
            </div>
          </label>
        </div>

        <div className="space-y-3">
          {isLoadingTasks && !hasTasks ? (
            <div className="text-app-2 text-sm">Загрузка задач…</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-app-2 text-sm">
              {normalizedQuery ? 'Нет задач, подходящих под условия поиска' : 'Нет задач для выбора'}
            </div>
          ) : (
            <ul className="space-y-3">
              {filteredTasks.map(({ key, info }) => {
                const isPicked = selected.has(key);
                const dueLabel = formatDueDate(info.due);
                const priorityMeta = getTaskPriorityMeta(info.priority);
                const parsedStatusColor = info.statusColor ? parseColor(info.statusColor) : null;
                const statusBadgeStyle = parsedStatusColor
                  ? {
                      color: '#f8fafc',
                      backgroundColor: asCssColor(parsedStatusColor, 0.24),
                      boxShadow: `0 0 0 1px ${asCssColor(parsedStatusColor, 0.45)}`,
                    }
                  : undefined;
                const assigneeNames = Array.isArray(info.assignees)
                  ? info.assignees
                      .map((assignee) => assignee?.name ?? assignee?.email ?? assignee?.id)
                      .filter((value): value is string => Boolean(value))
                  : [];

                const handleToggle = () => {
                  if (!info.boardId || !info.taskId) return;
                  onToggle(info.boardId, info.taskId);
                };

                const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    handleToggle();
                  }
                };

                return (
                  <li key={key}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={handleToggle}
                      onKeyDown={handleKeyDown}
                      aria-pressed={isPicked}
                      className={[
                        'relative overflow-hidden rounded-2xl ring-1 ring-app px-4 py-3 backdrop-blur-sm border border-app transition-colors cursor-pointer select-none',
                        isPicked
                          ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-slate-900 ring-emerald-500/60 border-emerald-200/80 shadow-lg shadow-emerald-500/20'
                          : 'bg-app-hover text-app hover:bg-app-hover',
                      ].join(' ')}
                    >
                      <div className="relative z-[1] flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold leading-snug">{info.taskTitle}</div>
                          <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-emerald-200">
                            {info.projectName}
                          </div>
                          {dueLabel && (
                            <div className={isPicked ? 'mt-1 text-sm text-slate-800' : 'mt-1 text-sm text-app-2'}>
                              Срок: {dueLabel}
                            </div>
                          )}
                          {assigneeNames.length > 0 && (
                            <div className={isPicked ? 'mt-1 text-xs text-slate-800/80' : 'mt-1 text-xs text-app-2'}>
                              Исполнители: {assigneeNames.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs ring-1 ${priorityMeta.badgeClass}`}>
                            {priorityMeta.label}
                          </span>
                          {info.statusName && (
                            <span
                              className={[
                                'inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-semibold',
                                statusBadgeStyle ? 'ring-1 ring-white/30 text-white' : 'ring-1 ring-slate-500/50 bg-slate-700/40 text-white',
                                isPicked ? 'text-slate-900' : '',
                              ].join(' ')}
                              style={statusBadgeStyle ?? undefined}
                            >
                              {info.statusName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {projects.map((project) => (
        <ProjectBoards
          key={project.id}
          projectId={project.id}
          projectName={project.name}
          onBoardTasksUpdate={handleBoardTasksUpdate}
          onBoardLoadingChange={handleBoardLoadingChange}
        />
      ))}
    </>
  );
}

function ProjectBoards({
  projectId,
  projectName,
  onBoardTasksUpdate,
  onBoardLoadingChange,
}: {
  projectId: string;
  projectName: string;
  onBoardTasksUpdate?: (boardId: string, tasks: Map<string, TaskInfo>) => void;
  onBoardLoadingChange?: (id: string, isLoading: boolean) => void;
}) {
  const hasCreds = isAuthed();
  const { data: boards, isLoading: boardsLoading } = useProjectBoards(projectId, hasCreds);

  useEffect(() => {
    if (!onBoardLoadingChange) return;
    const loadingKey = `project:${projectId}`;
    onBoardLoadingChange(loadingKey, boardsLoading);
    return () => {
      onBoardLoadingChange(loadingKey, false);
    };
  }, [projectId, boardsLoading, onBoardLoadingChange]);

  if (!boards || boards.length === 0) {
    return null;
  }

  return (
    <>
      {boards.map((board) => (
        <BoardTasks
          key={board.id}
          projectId={projectId}
          projectName={projectName}
          boardId={board.id}
          boardName={board.name}
          onBoardTasksUpdate={onBoardTasksUpdate}
          onBoardLoadingChange={onBoardLoadingChange}
        />
      ))}
    </>
  );
}

function BoardTasks({
  projectId,
  projectName,
  boardId,
  boardName,
  onBoardTasksUpdate,
  onBoardLoadingChange,
}: {
  projectId: string;
  projectName: string;
  boardId: string;
  boardName: string;
  onBoardTasksUpdate?: (boardId: string, tasks: Map<string, TaskInfo>) => void;
  onBoardLoadingChange?: (id: string, isLoading: boolean) => void;
}) {
  const { data: tasks, isLoading } = useBoardTasksByProjectAndBoard(projectId, boardId);

  useEffect(() => {
    if (!onBoardLoadingChange) return;
    const loadingKey = `board:${boardId}`;
    onBoardLoadingChange(loadingKey, isLoading);
    return () => {
      onBoardLoadingChange(loadingKey, false);
    };
  }, [boardId, isLoading, onBoardLoadingChange]);

  useEffect(() => {
    if (!onBoardTasksUpdate) return;
    const taskMap = new Map<string, TaskInfo>();
    if (Array.isArray(tasks)) {
      tasks.forEach((task) => {
        const key = `${boardId}:${task.id}`;
        const status = Array.isArray(task.statuses)
          ? task.statuses.find((item) => item?.boardId === boardId) ?? task.statuses[0]
          : undefined;
        taskMap.set(key, {
          taskId: task.id,
          boardId,
          projectId,
          taskTitle: task.title,
          boardName,
          projectName,
          due: task.due,
          statusName: status?.name ?? status?.key,
          statusColor: status?.color,
          priority: task.priority,
          assignees: task.assignees,
          description: task.description,
        });
      });
    }
    onBoardTasksUpdate(boardId, taskMap);
  }, [tasks, boardId, boardName, projectId, projectName, onBoardTasksUpdate]);

  useEffect(() => {
    if (!onBoardTasksUpdate) return;
    return () => {
      onBoardTasksUpdate(boardId, new Map());
    };
  }, [boardId, onBoardTasksUpdate]);

  return null;
}
