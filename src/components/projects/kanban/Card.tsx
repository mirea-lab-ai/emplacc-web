'use client';

import Avatar from '@/components/ui/Avatar';
import { getTaskPriorityMeta, type UITask } from '@/features/tasks/types';

const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export default function Card({
                                task, fromColId, onRemove, onEdit, isDeleting = false,
                            }: { task: UITask; fromColId: string; onRemove: () => void; onEdit: () => void; isDeleting?: boolean }) {
    const onDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromColId }));
        e.dataTransfer.effectAllowed = 'move';
    };

    const assignees = task.assignees ?? [];
    const visibleAssignees = assignees.slice(0, 3);
    const remainingAssignees = assignees.length - visibleAssignees.length;
    const primaryAssignee = assignees[0];
    const primaryLabel = primaryAssignee?.name || primaryAssignee?.email || primaryAssignee?.id;

    const priorityMeta = getTaskPriorityMeta(task.priority);

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
            {task.due && <div className="text-slate-400 text-sm mt-1">До: {formatDate(task.due)}</div>}
            <div className="mt-2">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityMeta.badgeClass}`}>
                    {priorityMeta.label}
                </span>
            </div>

            {assignees.length > 0 ? (
                <div className="mt-3 flex items-center gap-3">
                    <div className="flex items-center -space-x-2">
                        {visibleAssignees.map((assignee, index) => {
                            const key = assignee.id ?? assignee.email ?? `${assignee.name ?? 'user'}-${index}`;
                            const nameForAvatar = assignee.name || assignee.email || assignee.id || 'Исполнитель';
                            return (
                                <span key={key} className="inline-flex">
                                    <Avatar
                                        name={nameForAvatar}
                                        url={assignee.avatar}
                                        email={assignee.email}
                                        fallbackKey={assignee.id ?? assignee.name ?? assignee.email ?? undefined}
                                        size="sm"
                                    />
                                </span>
                            );
                        })}
                        {remainingAssignees > 0 && (
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs text-white ring-1 ring-white/10">
                                +{remainingAssignees}
                            </span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <div className="text-sm text-white truncate">
                            {primaryLabel ?? 'Исполнитель'}
                        </div>
                        {primaryAssignee?.email && (
                            <div className="text-xs text-slate-400 truncate">{primaryAssignee.email}</div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="mt-3 text-xs text-slate-400">Исполнитель не назначен</div>
            )}
        </div>
    );
}
