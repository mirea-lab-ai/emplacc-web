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
}: {
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
}) {
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        try {
            const data = JSON.parse(e.dataTransfer.getData('application/json')) as {
                taskId: string; fromColId: string;
            };
            if (data?.taskId && data?.fromColId) onDrop(data);
        } catch { }
    };

    return (
        <div className="group flex flex-col h-full min-h-0 flex-1 min-w-[320px]">
            <div className="mb-2 flex items-center justify-between px-3">
                <div className="font-semibold flex items-center gap-2 min-w-0 flex-1">
                    {column.color && (
                        <div
                            className="w-4 h-4 rounded border border-white/20 flex-shrink-0"
                            style={{ backgroundColor: column.color }}
                        />
                    )}
                    <span className="align-middle text-xl truncate" title={column.title}>{column.title}</span>
                    {canEdit && showActions && (
                        <button
                            onClick={onRename}
                            className="ml-2 align-middle transition rounded-md p-1 ring-1 ring-white/10 hover:bg-emerald-800 flex-shrink-0"
                            title="Переименовать"
                        >
                            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
                            </svg>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={onAddTask}
                        disabled={isCreatingTask}
                        className="rounded-md bg-white/6 px-3 py-2 text-sm hover:bg-white/8 transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreatingTask ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-6.219-8.56" />
                                </svg>
                                Создание...
                            </>
                        ) : (
                            '+ Задача'
                        )}
                    </button>
                    {canEdit && showActions && (
                        <button
                            onClick={onRemove}
                            disabled={isDeleting}
                            className="rounded-md p-1 ring-1 ring-white/10 hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={isDeleting ? "Удаление..." : "Удалить колонку"}
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
            </div>

            <Panel
                className="t-surface text-white flex flex-col h-full min-h-0 flex-1"
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={handleDrop}
            >
                {/* список задач занимает ВСЮ оставшуюся высоту, скролл только внутри */}
                <div className="flex-1 min-h-0 overflow-auto custom-scroll space-y-2 p-3">
                    {column.tasks.map((t) => (
                        <Card key={t.id} task={t} fromColId={column.id} onRemove={() => onRemoveTask(t.id)} onEdit={() => onEditTask(t.id)} isDeleting={isDeletingTask} />
                    ))}
                </div>
            </Panel>
        </div>
    );
}
