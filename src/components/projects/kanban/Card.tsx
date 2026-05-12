'use client';

import type { DragEvent } from 'react';
import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { getTaskPriorityMeta, type UITask } from '@/features/tasks/types';

type Props = {
  task: UITask;
  fromColId: string;
  onRemove: () => void;
  onEdit: () => void;
  isDeleting?: boolean;
  readOnly?: boolean;
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
};

export default function Card({
  task,
  fromColId,
  onRemove,
  onEdit,
  isDeleting = false,
  readOnly = false,
}: Props) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    event.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromColId }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const assignees = task.assignees ?? [];
  const visibleAssignees = assignees.slice(0, 3);
  const remainingAssignees = assignees.length - visibleAssignees.length;
  const primaryAssignee = assignees[0];
  const primaryLabel = primaryAssignee?.name || primaryAssignee?.email || primaryAssignee?.id;

  const priorityMeta = getTaskPriorityMeta(task.priority);

  const containerClasses = [
    'group relative rounded-lg border border-white/6 p-3 t-accent-grad/20',
    readOnly ? 'cursor-default' : 'cursor-grab active:cursor-grabbing hover:brightness-110',
  ].join(' ');

  return (
    <div
      draggable={!readOnly}
      onDragStart={handleDragStart}
      className={containerClasses}
      title={readOnly ? undefined : 'Перетащите, чтобы сменить статус'}
    >
      <div className="absolute right-2 top-2 hidden gap-1 group-hover:flex">
        <Link
          href={`/tasks/${task.id}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded-md p-1 ring-1 ring-white/10 transition hover:bg-indigo-800"
          title="Открыть задачу"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </Link>
        {!readOnly && (
          <>
            <button
              onClick={onEdit}
              className="rounded-md p-1 ring-1 ring-white/10 transition hover:bg-emerald-800"
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
              className="rounded-md p-1 ring-1 ring-white/10 transition hover:bg-[#ef4657]/25 hover:text-white hover:ring-[#ef4657]/40 disabled:cursor-not-allowed disabled:opacity-50"
              title={isDeleting ? 'Удаление…' : 'Удалить задачу'}
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
          </>
        )}
      </div>

      <div className="font-medium">{task.title}</div>
      {task.due && <div className="mt-1 text-sm text-slate-400">Срок: {formatDate(task.due)}</div>}
      <div className="mt-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityMeta.badgeClass}`}>
          {priorityMeta.label}
        </span>
      </div>

      {assignees.length > 0 ? (
        <div className="mt-3 flex items-center gap-3">
          <div className="-space-x-2 flex items-center">
            {visibleAssignees.map((assignee, index) => {
              const key = assignee.id ?? assignee.email ?? `${assignee.name ?? 'user'}-${index}`;
              const nameForAvatar = assignee.name || assignee.email || assignee.id || 'Без имени';
              return (
                <span key={key} className="inline-flex">
                  <Avatar
                    name={nameForAvatar}
                    url={assignee.avatar}
                    email={assignee.email}
                    fallbackKey={assignee.id ?? assignee.name ?? assignee.email ?? undefined}
                    size='sm'
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
            <div className="truncate text-sm text-white">{primaryLabel ?? 'Без исполнителя'}</div>
            {primaryAssignee?.email && (
              <div className="truncate text-xs text-slate-400">{primaryAssignee.email}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-3 text-xs text-slate-400">Исполнитель не назначен</div>
      )}
    </div>
  );
}
