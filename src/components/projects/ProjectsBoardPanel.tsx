'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import KanbanBoard, { KBColumn } from '@/components/projects/kanban';
import { useProjectBoards, useDeleteBoard } from '@/features/boards/hooks';
import { useBoardStatus, useCreateStatus, useDeleteStatus } from '@/features/status/hooks';
import { useCreateTask, useDeleteTask, useMoveTask, useUpdateTask } from '@/features/tasks/hooks';
import { getUserId, isAuthed } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/components/ui/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { useIsClient } from '@/hooks/useIsClient';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { UIBoard } from '@/features/boards/api';

const demoColumns: KBColumn[] = [
  { id: 'c-open', title: 'Open', tasks: [] },
  { id: 'c-done', title: 'Done', tasks: [] },
];

const HTTP_PREFIX_REGEX = /^HTTP\s+\d+\s*:?[ \t-]*/i;

function normalizeTaskErrorMessage(raw: string): string {
  const trimmed = raw.trim();
  const withoutPrefix = trimmed.replace(HTTP_PREFIX_REGEX, '').trim();
  const base = (withoutPrefix.length > 0 ? withoutPrefix : trimmed) || 'Неизвестная ошибка';

  if (base.startsWith('{') || base.startsWith('[')) {
    try {
      const parsed = JSON.parse(base) as unknown;
      if (typeof parsed === 'string' && parsed.trim()) {
        return parsed.trim();
      }
      if (parsed && typeof parsed === 'object') {
        const candidate =
          (parsed as { message?: unknown }).message ??
          (parsed as { error?: unknown }).error ??
          (parsed as { detail?: unknown }).detail;

        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }

        const errors = (parsed as { errors?: unknown }).errors;
        if (Array.isArray(errors)) {
          const joined = errors
            .map((item) => {
              if (typeof item === 'string') return item.trim();
              if (item && typeof item === 'object' && 'message' in item) {
                const msg = (item as { message?: unknown }).message;
                if (typeof msg === 'string') return msg.trim();
              }
              try {
                return JSON.stringify(item);
              } catch {
                return String(item);
              }
            })
            .filter((item) => typeof item === 'string' && item.length > 0)
            .join('\n');

          if (joined.trim()) {
            return joined.trim();
          }
        }
      }
    } catch {
      // игнорируем ошибки парсинга
    }
  }

  return base;
}

type Props = {
  projectId: string;
  selectedBoardId?: string;
  onSelectBoard?: (boardId: string | null) => void;
  readOnly?: boolean;
};

type HeaderControls = {
  openAddColumn: () => void;
  canAdd: boolean;
  isCreating: boolean;
};

export default function ProjectsBoardPanel({
  projectId,
  selectedBoardId,
  onSelectBoard,
  readOnly = false,
}: Props) {
  const [internalBoardId, setInternalBoardId] = useState<string | null>(null);
  const [headerControls, setHeaderControls] = useState<HeaderControls | null>(null);
  const [columnsEditMode, setColumnsEditMode] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: boards, isLoading, error } = useProjectBoards(projectId, hasCreds);
  const { mutate: deleteBoard } = useDeleteBoard();
  const confirm = useConfirm();
  const { mutate: createStatus, isPending: isCreatingStatus } = useCreateStatus();
  const { mutate: removeStatus, isPending: isDeletingStatus } = useDeleteStatus();
  const { mutateAsync: createTaskAsync, isPending: isCreatingTask } = useCreateTask();
  const { mutate: removeTask, isPending: isDeletingTask } = useDeleteTask();
  const { mutate: moveTask, isPending: isMovingTask } = useMoveTask();
  const { error: toastError } = useToast();
  const queryClient = useQueryClient();
  const { mutateAsync: updateTaskAsync, isPending: isUpdatingTask } = useUpdateTask();

  const boardsList: UIBoard[] = useMemo(() => boards ?? [], [boards]);

  useEffect(() => {
    if (readOnly) {
      setColumnsEditMode(false);
      setHeaderControls(null);
    }
  }, [readOnly]);

  const resolveActiveBoardId = useCallback((): string | null => {
    if (selectedBoardId !== undefined) return selectedBoardId;
    if (internalBoardId) return internalBoardId;
    return boardsList[0]?.id ?? null;
  }, [selectedBoardId, internalBoardId, boardsList]);

  const activeBoardId = resolveActiveBoardId();
  const currentBoardIndex = activeBoardId
    ? boardsList.findIndex((board) => board.id === activeBoardId)
    : -1;
  const currentBoard = currentBoardIndex >= 0 ? boardsList[currentBoardIndex] : boardsList[0];

  const { data: boardStatus, isLoading: statusLoading, error: statusError } = useBoardStatus(
    currentBoard?.id ?? null,
    hasCreds && !!currentBoard?.id && !isLoading,
  );

  useEffect(() => {
    if (!boardsList.length) {
      setInternalBoardId(null);
      return;
    }

    if (selectedBoardId !== undefined) {
      setInternalBoardId(selectedBoardId);
      return;
    }

    if (!internalBoardId || !boardsList.some((board) => board.id === internalBoardId)) {
      setInternalBoardId(boardsList[0]?.id ?? null);
    }
  }, [boardsList, selectedBoardId, internalBoardId]);

  const columns: KBColumn[] = useMemo(() => {
    if (boardStatus?.statuses && boardStatus.statuses.length > 0) {
      return boardStatus.statuses.map((status) => ({
        id: status.id,
        title: status.name,
        tasks: status.tasks ?? [],
        color: status.color,
        order: status.order,
        isOpen: status.isOpen,
      }));
    }
    if (!statusLoading && !statusError && currentBoard?.id) {
      return demoColumns;
    }
    return [];
  }, [boardStatus, statusLoading, statusError, currentBoard?.id]);

  const handleSelectBoard = useCallback(
    (boardId: string | null) => {
      onSelectBoard?.(boardId);
      if (selectedBoardId === undefined) {
        setInternalBoardId(boardId);
      }
    },
    [onSelectBoard, selectedBoardId],
  );

  useEffect(() => {
    if (columns.length === 0) return;
    try {
      localStorage.setItem('proj_kanban_v2', JSON.stringify(columns));
    } catch {
      // игнорируем ошибки доступа к localStorage
    }
  }, [columns]);

  const handleCreateStatus = (betweenIndex: number, title: string, color: string) => {
    if (readOnly) return;
    if (!currentBoard?.id) return;

    const sorted = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let newOrder = 1024;

    if (sorted.length >= 2 && betweenIndex > 0 && betweenIndex < sorted.length) {
      const prev = sorted[betweenIndex - 1];
      const next = sorted[betweenIndex];
      const prevOrder = prev.order ?? 0;
      const nextOrder = next.order ?? prevOrder + 2048;
      newOrder = Math.floor((prevOrder + nextOrder) / 2);
    } else if (sorted.length === 1) {
      newOrder = (sorted[0].order ?? 0) + 1024;
    } else if (sorted.length === 0) {
      newOrder = 0;
    }

    createStatus({
      name: title,
      color,
      board_id: currentBoard.id,
      order: newOrder,
      is_active: true,
      is_default: false,
      is_open: true,
    });
  };

  const handleDeleteStatus = (statusId: string) => {
    if (readOnly) return;
    removeStatus(statusId);
  };

  const handleCreateTask = async (
    statusId: string,
    title: string,
    description?: string,
    assignedTo?: string,
    deadline?: string,
    priority?: number,
  ): Promise<void> => {
    if (readOnly) return;
    const userId = getUserId();
    if (!userId) {
      throw new Error('Не удалось определить текущего пользователя.');
    }

    const payload = {
      name: title,
      description: description?.trim() ? description : undefined,
      status_id: statusId,
      creator_id: userId,
      priority: priority ?? 0,
      start_date: new Date().toISOString(),
      deadline: deadline ? new Date(deadline).toISOString() : new Date().toISOString(),
      assigned_to: assignedTo,
      category: 0,
    };

    try {
      await createTaskAsync(payload);
    } catch (err) {
      const message = normalizeTaskErrorMessage(getErrorMessage(err));
      throw new Error(message.startsWith('Не удалось') ? message : `Не удалось создать задачу: ${message}`);
    }
  };

  const handleUpdateTask = async (
    taskId: string,
    title: string,
    description?: string,
    assignedTo?: string,
    deadline?: string,
    priority?: number,
  ): Promise<void> => {
    const payload: Record<string, unknown> = {
      name: title,
    };

    if (description !== undefined) payload.description = description;
    if (assignedTo !== undefined) payload.assigned_to = assignedTo;
    if (priority !== undefined) payload.priority = priority;
    if (deadline) payload.deadline = new Date(deadline).toISOString();

    try {
      await updateTaskAsync({ taskId, payload });
    } catch (err) {
      const message = normalizeTaskErrorMessage(getErrorMessage(err));
      throw new Error(message.startsWith('Не удалось') ? message : `Не удалось обновить задачу: ${message}`);
    }
  };

  const handleDeleteTask = (taskId: string) => {
    if (readOnly) return;
    removeTask(taskId);
  };

  const handleMoveTask = (taskId: string, statusId: string) => {
    if (readOnly) return;
    moveTask(
      { task_id: taskId, status_id: statusId },
      {
        onError: (err) => {
          // Сообщаем причину (например 409 close-gate) и откатываем оптимистичный
          // перенос: рефетч статусов вернёт доске истинное состояние, KanbanBoard
          // ре-синкает колонки из props.
          toastError(getErrorMessage(err));
          queryClient.invalidateQueries({ queryKey: ['boardStatus'] });
          queryClient.invalidateQueries({ queryKey: ['boardTasks'] });
        },
      },
    );
  };

  const handlePrevBoard = () => {
    if (!boardsList.length || currentBoardIndex < 0) return;
    const nextIndex = currentBoardIndex === 0 ? boardsList.length - 1 : currentBoardIndex - 1;
    handleSelectBoard(boardsList[nextIndex]?.id ?? null);
  };

  const handleNextBoard = () => {
    if (!boardsList.length || currentBoardIndex < 0) return;
    const nextIndex = currentBoardIndex === boardsList.length - 1 ? 0 : currentBoardIndex + 1;
    handleSelectBoard(boardsList[nextIndex]?.id ?? null);
  };

  const handleDeleteBoard = async () => {
    if (readOnly || !currentBoard) return;
    if (!(await confirm({
      title: 'Удалить доску',
      message: `Удалить доску «${currentBoard.name}» со всеми статусами и задачами?`,
      danger: true,
      confirmLabel: 'Удалить',
    }))) return;

    deleteBoard(
      { boardId: currentBoard.id, projectId },
      {
        onSuccess: () => {
          if (boardsList.length <= 1) {
            handleSelectBoard(null);
          } else {
            const nextIndex = currentBoardIndex === boardsList.length - 1 ? 0 : currentBoardIndex;
            handleSelectBoard(boardsList[nextIndex]?.id ?? null);
          }
        },
      },
    );
  };

  const handleHeaderStateChange = useCallback(
    (state: HeaderControls) => {
      if (readOnly) {
        setHeaderControls(null);
        return;
      }
      setHeaderControls(state);
    },
    [readOnly],
  );

  const addColumnDisabled =
    !headerControls || !headerControls.canAdd || headerControls.isCreating || readOnly;

  return (
    <>
      <Panel className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-4 t-surface">
        {/* Board Navigation Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevBoard}
            className="rounded-lg p-2 text-app transition-colors hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-30"
            disabled={boardsList.length <= 1}
            aria-label="Предыдущая доска"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 text-left">
            {isLoading ? (
              <div className="text-app-2">Загрузка досок…</div>
            ) : error ? (
              <div className="text-red-400">Не удалось загрузить доски</div>
            ) : !boardsList.length ? (
              <div className="text-app-2">Доски не найдены</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-app">{currentBoard?.name ?? 'Без названия'}</h2>
                  {!readOnly && columnsEditMode && currentBoard && (
                    <button
                      onClick={handleDeleteBoard}
                      className="p-1 text-app-2 transition-colors hover:text-red-500"
                      title="Удалить доску"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  )}
                </div>
                {currentBoard?.description && (
                  <p className="text-sm text-app-2">{currentBoard.description}</p>
                )}
                {boardStatus?.statuses && (
                  <p className="text-sm text-app-2">
                    {boardStatus.statuses.length}{' '}
                    {boardStatus.statuses.length === 1 ? 'колонка' : 'колонок'}
                  </p>
                )}
              </div>
            )}
          </div>

          {!readOnly && headerControls && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setColumnsEditMode((prev) => !prev)}
                className={[
                  'rounded-xl px-4 py-2 text-sm font-semibold transition',
                  columnsEditMode
                    ? 'bg-app-hover text-emerald-200 ring-1 ring-emerald-400'
                    : 'bg-app-subtle text-app hover:bg-app-hover',
                ].join(' ')}
              >
                {columnsEditMode ? 'Редактирование включено' : 'Режим редактирования'}
              </button>
              {columnsEditMode && (
                <button
                  onClick={headerControls.openAddColumn}
                  disabled={addColumnDisabled}
                  className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {headerControls.isCreating ? 'Создание…' : '+ Столбец'}
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleNextBoard}
            className="rounded-lg p-2 text-app transition-colors hover:bg-app-hover disabled:cursor-not-allowed disabled:opacity-30"
            disabled={boardsList.length <= 1}
            aria-label="Следующая доска"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden pb-2 custom-scroll">
          <div className="flex h-full min-w-max items-stretch gap-3">
            <KanbanBoard
              columns={columns}
              onChange={() => {}}
              viewportOffset={280}
              onCreateStatus={handleCreateStatus}
              isCreatingStatus={isCreatingStatus}
              onDeleteStatus={handleDeleteStatus}
              isDeletingStatus={isDeletingStatus}
              onCreateTask={handleCreateTask}
              isCreatingTask={isCreatingTask}
              onUpdateTask={handleUpdateTask}
              isUpdatingTask={isUpdatingTask}
              onDeleteTask={handleDeleteTask}
              isDeletingTask={isDeletingTask}
              onMoveTask={handleMoveTask}
              isMovingTask={isMovingTask}
              hideHeader
              onHeaderStateChange={handleHeaderStateChange}
              showColumnActions={columnsEditMode && !readOnly}
              readOnly={readOnly}
            />
          </div>
        </div>
      </Panel>

    </>
  );
}
