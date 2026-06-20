'use client';

import { useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
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
  moveTargets?: { id: string; title: string }[];
  onMove?: (toColId: string) => void;
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
  moveTargets = [],
  onMove,
}: Props) {
  const router = useRouter();
  const wasDragged = useRef(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const canMove = !readOnly && !!onMove && moveTargets.length > 0;

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    wasDragged.current = true;
    event.dataTransfer.setData('application/json', JSON.stringify({ taskId: task.id, fromColId }));
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    // сбрасываем флаг с небольшой задержкой чтобы onClick успел проверить
    setTimeout(() => { wasDragged.current = false; }, 50);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // не открываем если клик был на кнопках или если был drag
    if (wasDragged.current) return;
    if ((e.target as HTMLElement).closest('button,a')) return;
    router.push(`/tasks/${task.id}`);
  };

  const assignees = task.assignees ?? [];
  const visibleAssignees = assignees.slice(0, 3);
  const remainingAssignees = assignees.length - visibleAssignees.length;
  const primaryAssignee = assignees[0];
  const primaryLabel = primaryAssignee?.name || primaryAssignee?.email || primaryAssignee?.id;

  const priorityMeta = getTaskPriorityMeta(task.priority);

  const containerClasses = [
    'group relative rounded-lg border border-white/6 p-3 t-accent-grad/20',
    readOnly ? 'cursor-default' : 'cursor-pointer active:cursor-grabbing hover:brightness-110',
  ].join(' ');

  return (
    <div
      draggable={!readOnly}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardClick}
      className={containerClasses}
      title={readOnly ? undefined : 'Нажмите чтобы открыть · Тяните чтобы переместить'}
    >
      <div className="absolute right-2 top-2 flex gap-1 lg:hidden lg:group-hover:flex">
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
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="rounded-md p-1 ring-1 ring-white/10 transition hover:bg-emerald-800"
              title="Редактировать задачу"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20h9" />
                <path d="M16.5 3.5l4 4L7 21H3v-4L16.5 3.5z" />
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(); }}
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
        {canMove && (
          <button
            onClick={(e) => { e.stopPropagation(); setMoveOpen((v) => !v); }}
            className="rounded-md p-1 ring-1 ring-white/10 transition hover:bg-indigo-800"
            title="Переместить в колонку"
            aria-label="Переместить в колонку"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 9l-3 3 3 3" /><path d="M9 5l3-3 3 3" /><path d="M15 19l-3 3-3-3" /><path d="M19 9l3 3-3 3" />
              <line x1="2" y1="12" x2="22" y2="12" /><line x1="12" y1="2" x2="12" y2="22" />
            </svg>
          </button>
        )}
      </div>

      {canMove && moveOpen && (
        <div
          className="absolute right-2 top-10 z-20 w-44 overflow-hidden rounded-xl bg-[#0c1a10] ring-1 ring-white/15 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-slate-500">Переместить в</div>
          {moveTargets.map((col) => (
            <button
              key={col.id}
              onClick={(e) => { e.stopPropagation(); setMoveOpen(false); onMove?.(col.id); }}
              className="block w-full truncate px-3 py-2 text-left text-sm text-white/85 hover:bg-white/8"
            >
              {col.title}
            </button>
          ))}
        </div>
      )}

      <div className="font-medium pr-20">{task.title}</div>
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
