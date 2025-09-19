'use client';

import { KBTask } from './types';

export default function Card({
                                 task, fromColId, onRemove,
                             }: { task: KBTask; fromColId: string; onRemove: () => void }) {
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromColId }));
        e.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            draggable
            onDragStart={onDragStart}
            className="group relative rounded-xl bg-emerald-700 ring-1 ring-white/10 px-3 py-2 cursor-grab active:cursor-grabbing hover:brightness-110"
            title="Перетащите в соседнюю колонку"
        >
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 hidden group-hover:inline-flex rounded-md p-1 ring-1 ring-white/10 hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 transition"
                title="Удалить задачу"
            >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                </svg>
            </button>

            <div className="font-medium">{task.title}</div>
            {task.desc && <div className="text-slate-400 text-sm">{task.desc}</div>}
        </div>
    );
}
