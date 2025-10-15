'use client';

import { type UITask } from '@/features/tasks/types';

export default function Card({
                                task, fromColId, onRemove, onEdit, isDeleting = false,
                            }: { task: UITask; fromColId: string; onRemove: () => void; onEdit: () => void; isDeleting?: boolean }) {
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromColId }));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="group relative rounded-lg p-3 t-accent-grad/20 border border-white/6 cursor-grab active:cursor-grabbing hover:brightness-110"
            title="Перетащите в соседнюю колонку"
        >
            <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                <button
                    onClick={onEdit}
                    className="rounded-md p-1 ring-1 ring-white/10 hover:bg-emerald-800 transition"
                    title="Редактировать задачу"
                >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
                    </svg>
                </button>
                <button
                    onClick={onRemove}
                    disabled={isDeleting}
                    className="rounded-md p-1 ring-1 ring-white/10 hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isDeleting ? "Удаление..." : "Удалить задачу"}
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
            </div>

            <div className="font-medium">{task.title}</div>
            {task.due && <div className="text-slate-400 text-sm">До: {new Date(task.due).toLocaleDateString()}</div>}
            {task.priority && <div className="text-slate-400 text-sm">Приоритет: {task.priority}</div>}
        </div>
    );
}
