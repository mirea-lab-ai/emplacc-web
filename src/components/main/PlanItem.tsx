'use client';

import { useTaskById } from '@/features/tasks/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type Props = {
  taskId: string;
  description: string;
  onClick: (taskName: string, description: string) => void;
};

export default function PlanItem({ taskId, description, onClick }: Props) {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  
  const { data: taskData, isLoading } = useTaskById(taskId, hasCreds);

  const taskName = taskData?.name || (isLoading ? 'Загрузка...' : 'Задача не найдена');

  return (
    <li
      onClick={() => onClick(taskName, description)}
      className="rounded-xl px-4 py-2 backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10 cursor-pointer transition-colors"
    >
      <div className="font-medium mb-1">{taskName}</div>
      {description && (
        <div className="text-slate-400 text-sm truncate">
          {description}
        </div>
      )}
    </li>
  );
}
