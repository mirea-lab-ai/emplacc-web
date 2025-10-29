'use client';

import type { DragEvent } from 'react';
import Panel from '@/components/ui/Panel';
import Card from './Card';
import { KBColumn } from './types';

type Props = {
  column: KBColumn;
  onAddTask: () => void;
  onDrop: (payload: { taskId: string; fromColId: string }) => void;
  onRename: () => void;
  onRemove: () => void;
  onRemoveTask: (taskId: string) => void;
  onEditTask: (taskId: string) => void;
  isDeleting?: boolean;
  isCreatingTask?: boolean;
  isDeletingTask?: boolean;
  canEdit?: boolean;
  showActions?: boolean;
  readOnly?: boolean;
};

export default function Column({
  column,
  onAddTask,
  onDrop,
  onRename,
  onRemove,
  onRemoveTask,
  onEditTask,
  isDeleting = false,
  isCreatingTask = false,
  isDeletingTask = false,
  canEdit = true,
  showActions = false,
  readOnly = false,
}: Props) {
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json')) as {
        taskId: string;
        fromColId: string;
      };
      if (data?.taskId && data?.fromColId) onDrop(data);
    } catch {
      // игнорируем неверный payload
    }
  };

  return (
    <div className="group flex min-h-0 min-w-[320px] flex-1 flex-col">
      <div className="mb-2 flex items-center justify-between px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 font-semibold">
          {column.color && (
            <div
              className="h-4 w-4 flex-shrink-0 rounded border border-white/20"
              style={{ backgroundColor: column.color }}
            />
          )}
          <span className="truncate text-xl align-middle" title={column.title}>
            {column.title}
          </span>
          {canEdit && showActions && !readOnly && (
            <button
              onClick={onRename}
              className="ml-2 flex-shrink-0 rounded-md p-1 align-middle ring-1 ring-white/10 transition hover:bg-emerald-800"
              title="Переименовать"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20h9" />
                <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
              </svg>
            </button>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <button
              onClick={onAddTask}
              disabled={isCreatingTask}
              className="inline-flex items-center gap-2 rounded-md bg-white/6 px-3 py-2 text-sm transition hover:bg-white/8 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingTask ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                  Создание…
                </>
              ) : (
                '+ Задача'
              )}
            </button>
            {canEdit && showActions && (
              <button
                onClick={onRemove}
                disabled={isDeleting}
                className="rounded-md p-1 ring-1 ring-white/10 transition hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 disabled:cursor-not-allowed disabled:opacity-50"
                title={isDeleting ? 'Удаление…' : 'Удалить колонку'}
              >
                {isDeleting ? (
                  <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                  </svg>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <Panel
        className="t-surface flex h-full min-h-0 flex-1 flex-col text-white"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="custom-scroll flex-1 space-y-2 overflow-auto p-3">
          {column.tasks.map((task) => (
            <Card
              key={task.id}
              task={task}
              fromColId={column.id}
              onRemove={() => onRemoveTask(task.id)}
              onEdit={() => onEditTask(task.id)}
              isDeleting={isDeletingTask}
              readOnly={readOnly}
            />
          ))}
        </div>
      </Panel>
    </div>
  );
}
