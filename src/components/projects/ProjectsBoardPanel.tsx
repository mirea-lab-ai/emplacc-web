'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import KanbanBoard, { KBColumn } from '@/components/projects/kanban';
import { useProjectBoards, useDeleteBoard } from '@/features/boards/hooks';
import { useBoardStatus, useCreateStatus, useDeleteStatus } from '@/features/status/hooks';
import { useCreateTask, useDeleteTask, useMoveTask, useUpdateTask } from '@/features/tasks/hooks';
import { getUserId } from '@/lib/auth';
import { getErrorMessage } from '@/lib/errors';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import DeleteBoardModal from './DeleteBoardModal';
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
          (parsed as { message?: unknown }).message
          ?? (parsed as { error?: unknown }).error
          ?? (parsed as { detail?: unknown }).detail;

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
      // ignore JSON parse issues and fall back to base message
    }
  }

  return base;
}

type Props = {
  projectId: string;
  selectedBoardId?: string;
  onSelectBoard?: (boardId: string | null) => void;
};

type HeaderControls = {
  openAddColumn: () => void;
  canAdd: boolean;
  isCreating: boolean;
};

export default function ProjectsBoardPanel({ projectId, selectedBoardId, onSelectBoard }: Props) {
  const [internalBoardId, setInternalBoardId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [headerControls, setHeaderControls] = useState<HeaderControls | null>(null);
  const [columnsEditMode, setColumnsEditMode] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: boards, isLoading, error } = useProjectBoards(projectId, hasCreds);
  const { mutate: deleteBoard, isPending: isDeleting } = useDeleteBoard();
  const { mutate: createStatus, isPending: isCreatingStatus } = useCreateStatus();
  const { mutate: deleteStatus, isPending: isDeletingStatus } = useDeleteStatus();
  const { mutateAsync: createTaskAsync, isPending: isCreatingTask } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeletingTask } = useDeleteTask();
  const { mutate: moveTask, isPending: isMovingTask } = useMoveTask();
  const { mutateAsync: updateTaskAsync, isPending: isUpdatingTask } = useUpdateTask();
  const boardsList: UIBoard[] = React.useMemo(() => boards ?? [], [boards]);

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
  // Загружаем статусы/колонки для текущей доски
  const { data: boardStatus, isLoading: statusLoading, error: statusError } = useBoardStatus(
    currentBoard?.id ?? null, 
    hasCreds && !!currentBoard?.id && !isLoading
  );


  // Вычисляем колонки на основе данных из React Query
  const columns: KBColumn[] = React.useMemo(() => {
    if (boardStatus?.statuses && boardStatus.statuses.length > 0) {
      return boardStatus.statuses.map(status => ({
        id: status.id,
        title: status.name,
        tasks: status.tasks || [], // Используем задачи из статуса
        color: status.color,
        order: status.order,
      }));
    } else if (!statusLoading && !statusError && currentBoard?.id) {
      // Если нет статусов, но доска есть, используем demo колонки
      return demoColumns;
    }
    return [];
  }, [boardStatus, statusLoading, statusError, currentBoard?.id]);

  // Сбрасываем индекс доски при смене проекта
  useEffect(() => {
    setInternalBoardId(null);
  }, [projectId]);

  useEffect(() => {
    if (!boardsList.length) {
      setInternalBoardId(null);
      return;
    }

    if (selectedBoardId !== undefined) {
      // Управляется родителем — никаких действий
      return;
    }

    if (!internalBoardId || !boardsList.some((board) => board.id === internalBoardId)) {
      setInternalBoardId(boardsList[0].id);
    }
  }, [boardsList, selectedBoardId, internalBoardId]);

  const handleSelectBoard = useCallback(
    (boardId: string) => {
      onSelectBoard?.(boardId);
      if (selectedBoardId === undefined) {
        setInternalBoardId(boardId);
      }
    },
    [onSelectBoard, selectedBoardId]
  );

  // Сохраняем колонки в localStorage для совместимости
  useEffect(() => {
    if (columns.length > 0) {
      localStorage.setItem('proj_kanban_v2', JSON.stringify(columns));
    }
  }, [columns]);

  // Функция для создания нового статуса
  const handleCreateStatus = (betweenIndex: number, title: string, color: string) => {
    if (!currentBoard?.id) return;

    // Вычисляем order как среднее арифметическое между соседними столбцами
    const sortedColumns = [...columns].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    let newOrder = 1024; // Значение по умолчанию

    if (sortedColumns.length >= 2 && betweenIndex > 0 && betweenIndex < sortedColumns.length) {
      const prevColumn = sortedColumns[betweenIndex - 1];
      const nextColumn = sortedColumns[betweenIndex];
      const prevOrder = prevColumn.order ?? 0;
      const nextOrder = nextColumn.order ?? 1024;
      newOrder = Math.floor((prevOrder + nextOrder) / 2);
    } else if (sortedColumns.length === 1) {
      // Если только один столбец, добавляем после него
      const existingOrder = sortedColumns[0].order ?? 0;
      newOrder = existingOrder + 1024;
    } else if (sortedColumns.length === 0) {
      // Если нет столбцов, начинаем с 0
      newOrder = 0;
    }

    createStatus({
      name: title,
      color: color,
      board_id: currentBoard.id,
      order: newOrder,
      is_active: true,
      is_default: false,
      is_open: true,
    });
  };

  // Функция для удаления статуса
  const handleDeleteStatus = (statusId: string) => {
    deleteStatus(statusId);
  };

  // Функция для создания задачи
  const handleCreateTask = async (
    statusId: string,
    title: string,
    description?: string,
    assignedTo?: string,
    deadline?: string,
    priority?: number,
  ): Promise<void> => {
    const userId = getUserId();
    if (!userId) {
      console.error('User ID not found');
      throw new Error('Не удалось определить пользователя для создания задачи');
    }
    
    const currentTime = new Date().toISOString(); // Timestamp формат
    
    const taskData: any = {
      name: title,
      status_id: statusId,
      creator_id: userId,
      start_date: currentTime,
      category: 0,
    };

    // Добавляем только непустые поля
    if (description && description.trim()) {
      taskData.description = description;
    }
    
    if (assignedTo) {
      taskData.assigned_to = assignedTo;
    }
    
    if (priority) {
      taskData.priority = priority;
    }
    
    if (deadline) {
      taskData.deadline = new Date(deadline).toISOString();
    }

    try {
      await createTaskAsync(taskData);
    } catch (err) {
      const message = normalizeTaskErrorMessage(getErrorMessage(err));
      console.error('Проекты: ошибка создания задачи', err);
      throw new Error(message.startsWith('Не удалось') ? message : `Не удалось создать задачу: ${message}`);
    }
  };

  // Функция для обновления задачи
  const handleUpdateTask = async (
    taskId: string,
    title: string,
    description?: string,
    assignedTo?: string,
    deadline?: string,
    priority?: number,
  ): Promise<void> => {
    const userId = getUserId();
    if (!userId) {
      console.error('User ID not found');
      throw new Error('Не удалось определить пользователя для обновления задачи');
    }
    
    const taskData: any = {
      name: title,
    };

    // Добавляем только непустые поля
    if (description && description.trim()) {
      taskData.description = description;
    }
    
    if (assignedTo) {
      taskData.assigned_to = assignedTo;
    }
    
    if (priority) {
      taskData.priority = priority;
    }
    
    if (deadline) {
      taskData.deadline = new Date(deadline).toISOString();
    }

    try {
      await updateTaskAsync({ taskId, payload: taskData });
    } catch (err) {
      const message = normalizeTaskErrorMessage(getErrorMessage(err));
      console.error('Проекты: ошибка обновления задачи', err);
      throw new Error(message.startsWith('Не удалось') ? message : `Не удалось обновить задачу: ${message}`);
    }
  };

  // Функция для удаления задачи
  const handleDeleteTask = (taskId: string) => {
    deleteTask(taskId);
  };

  // Функция для перемещения задачи
  const handleMoveTask = (taskId: string, statusId: string) => {
    moveTask({
      task_id: taskId,
      status_id: statusId,
    });
  };

  const handlePrevBoard = () => {
    if (!boardsList.length || currentBoardIndex < 0) return;
    const nextIndex = currentBoardIndex === 0 ? boardsList.length - 1 : currentBoardIndex - 1;
    const nextBoardId = boardsList[nextIndex]?.id;
    if (nextBoardId) {
      handleSelectBoard(nextBoardId);
    }
  };

  const handleNextBoard = () => {
    if (!boardsList.length || currentBoardIndex < 0) return;
    const nextIndex = currentBoardIndex === boardsList.length - 1 ? 0 : currentBoardIndex + 1;
    const nextBoardId = boardsList[nextIndex]?.id;
    if (nextBoardId) {
      handleSelectBoard(nextBoardId);
    }
  };

  const handleDeleteBoard = () => {
    if (!currentBoard) return;
    deleteBoard(
      { boardId: currentBoard.id, projectId },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          const remaining = boardsList.filter((board) => board.id !== currentBoard.id);
          const fallbackBoard = remaining[currentBoardIndex]
            ?? remaining[currentBoardIndex - 1]
            ?? remaining[0];

          if (fallbackBoard) {
            handleSelectBoard(fallbackBoard.id);
          } else {
            if (selectedBoardId === undefined) {
              setInternalBoardId(null);
            }
            onSelectBoard?.(null);
          }
        },
      }
    );
  };

  const handleHeaderStateChange = useCallback((controls: HeaderControls) => {
    setHeaderControls((prev) => {
      if (
        prev &&
        prev.openAddColumn === controls.openAddColumn &&
        prev.canAdd === controls.canAdd &&
        prev.isCreating === controls.isCreating
      ) {
        return prev;
      }
      return controls;
    });
  }, []);

  const addColumnDisabled = headerControls ? (!headerControls.canAdd || headerControls.isCreating) : true;

  return (
    <>
      <Panel className="flex h-full min-h-0 w-full flex-1 flex-col gap-4 overflow-hidden p-4 t-surface">
        {/* Board Navigation Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevBoard}
            className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={boardsList.length <= 1}
            aria-label="Предыдущая доска"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="flex-1 text-left">
            {isLoading ? (
              <div className="text-slate-400">Загрузка досок...</div>
            ) : error ? (
              <div className="text-red-400">Ошибка загрузки досок</div>
            ) : !boardsList.length ? (
              <div className="text-slate-400">Нет досок</div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold text-white">
                    {currentBoard?.name ?? 'Без названия'}
                  </h2>
                  {columnsEditMode && currentBoard && (
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-1"
                      title="Удалить доску"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                {currentBoard?.description && (
                  <p className="text-sm text-slate-400">{currentBoard.description}</p>
                )}
                {boardStatus?.statuses && (
                  <p className="text-sm text-slate-400">
                    {boardStatus.statuses.length} {boardStatus.statuses.length === 1 ? 'колонка' : 'колонок'}
                  </p>
                )}
              </div>
            )}
          </div>

          {headerControls && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setColumnsEditMode((prev) => !prev)}
                className={[
                  'rounded-xl px-4 py-2 text-sm font-semibold transition',
                  columnsEditMode
                    ? 'bg-white/15 text-emerald-200 ring-1 ring-emerald-400'
                    : 'bg-white/6 text-slate-100 hover:bg-white/10'
                ].join(' ')}
              >
                {columnsEditMode ? 'Режим редактирования — вкл.' : 'Режим редактирования'}
              </button>
              {columnsEditMode && (
                <button
                  onClick={headerControls.openAddColumn}
                  disabled={addColumnDisabled}
                  className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-50"
                >
                  {headerControls.isCreating ? 'Создание...' : '+ Столбец'}
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleNextBoard}
            className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            disabled={boardsList.length <= 1}
            aria-label="Следующая доска"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              showColumnActions={columnsEditMode}
            />
          </div>
        </div>
      </Panel>
        {showDeleteModal && currentBoard && (
          <DeleteBoardModal
            boardName={currentBoard.name}
            onConfirm={handleDeleteBoard}
            onCancel={() => setShowDeleteModal(false)}
            isDeleting={isDeleting}
          />
        )}
      </>
    );
}
