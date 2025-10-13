'use client';

import React, { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import KanbanBoard, { KBColumn } from '@/components/projects/kanban';
import { useProjectBoards, useDeleteBoard } from '@/features/boards/hooks';
import { useBoardStatus, useCreateStatus, useDeleteStatus } from '@/features/status/hooks';
import { useCreateTask, useDeleteTask, useMoveTask } from '@/features/tasks/hooks';
import { getUserId } from '@/lib/auth';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import CreateBoardModal from './CreateBoardModal';
import DeleteBoardModal from './DeleteBoardModal';

const demoColumns: KBColumn[] = [
  { id: 'c-open', title: 'Open', tasks: [] },
  { id: 'c-done', title: 'Done', tasks: [] },
];

type Props = {
  projectId: string;
};

export default function ProjectsBoardPanel({ projectId }: Props) {
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: boards, isLoading, error } = useProjectBoards(projectId, hasCreds);
  const { mutate: deleteBoard, isPending: isDeleting } = useDeleteBoard();
  const { mutate: createStatus, isPending: isCreatingStatus } = useCreateStatus();
  const { mutate: deleteStatus, isPending: isDeletingStatus } = useDeleteStatus();
  const { mutate: createTask, isPending: isCreatingTask } = useCreateTask();
  const { mutate: deleteTask, isPending: isDeletingTask } = useDeleteTask();
  const { mutate: moveTask, isPending: isMovingTask } = useMoveTask();
  const currentBoard = boards?.[currentBoardIndex];
  
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
    setCurrentBoardIndex(0);
  }, [projectId]);

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
  const handleCreateTask = (statusId: string, title: string, description?: string) => {
    const userId = getUserId();
    if (!userId) {
      console.error('User ID not found');
      return;
    }
    
    const currentTime = new Date().toISOString(); // Timestamp формат
    
    const taskData: any = {
      name: title,
      status_id: statusId,
      creator_id: userId,
      assigned_to: userId, // Исполнитель = создатель
      priority: 1,
      start_date: currentTime,
      deadline: currentTime, // Дедлайн = время старта
      category: 0,
    };

    // Добавляем только непустые поля
    if (description && description.trim()) {
      taskData.description = description;
    }

    createTask(taskData);
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
    if (!boards || boards.length === 0) return;
    setCurrentBoardIndex((prev) => (prev === 0 ? boards.length - 1 : prev - 1));
  };

  const handleNextBoard = () => {
    if (!boards || boards.length === 0) return;
    setCurrentBoardIndex((prev) => (prev === boards.length - 1 ? 0 : prev + 1));
  };

  const handleDeleteBoard = () => {
    if (!currentBoard) return;
    deleteBoard(
      { boardId: currentBoard.id, projectId },
      {
        onSuccess: () => {
          setShowDeleteModal(false);
          // Если удалили последнюю доску, сбросить индекс
          if (boards && boards.length <= 1) {
            setCurrentBoardIndex(0);
          } else if (currentBoardIndex >= (boards?.length ?? 1) - 1) {
            // Если удалили доску с последним индексом, перейти к предыдущей
            setCurrentBoardIndex((prev) => Math.max(0, prev - 1));
          }
        },
      }
    );
  };

  return (
    <>
      <Panel className="p-6 t-surface">
        {/* Board Navigation Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            {isLoading ? (
              <div className="text-slate-400">Загрузка досок...</div>
            ) : error ? (
              <div className="text-red-400">Ошибка загрузки досок</div>
            ) : !boards || boards.length === 0 ? (
              <div className="text-slate-400">Нет досок</div>
            ) : (
              <>
                <button
                  onClick={handlePrevBoard}
                  className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={boards.length <= 1}
                  aria-label="Предыдущая доска"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                    <div className="flex-1 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <h2 className="text-xl font-semibold text-white">
                          {currentBoard?.name ?? 'Без названия'}
                        </h2>
                        {currentBoard && (
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
                        <p className="text-sm text-slate-400 mt-1">{currentBoard.description}</p>
                      )}
                      {boardStatus?.statuses && (
                        <p className="text-sm text-slate-400 mt-1">
                          {boardStatus.statuses.length} {boardStatus.statuses.length === 1 ? 'колонка' : 'колонок'}
                        </p>
                      )}
                    </div>

                <button
                  onClick={handleNextBoard}
                  className="rounded-lg p-2 text-white hover:bg-white/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  disabled={boards.length <= 1}
                  aria-label="Следующая доска"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Create Board Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="ml-4 rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 transition-colors whitespace-nowrap"
          >
            + Создать доску
          </button>
        </div>

        {/* Kanban Board */}
        <KanbanBoard 
          columns={columns} 
          onChange={() => {}} 
          viewportOffset={260}
          onCreateStatus={handleCreateStatus}
          isCreatingStatus={isCreatingStatus}
          onDeleteStatus={handleDeleteStatus}
          isDeletingStatus={isDeletingStatus}
          onCreateTask={handleCreateTask}
          isCreatingTask={isCreatingTask}
          onDeleteTask={handleDeleteTask}
          isDeletingTask={isDeletingTask}
          onMoveTask={handleMoveTask}
          isMovingTask={isMovingTask}
        />
      </Panel>

        {showCreateModal && (
          <CreateBoardModal
            projectId={projectId}
            onClose={() => setShowCreateModal(false)}
          />
        )}

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

function safeParse<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
