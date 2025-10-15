'use client';

import { useState, useEffect, useMemo } from 'react';
import Panel from '@/components/ui/Panel';
import TaskDetailModal from './TaskDetailModal';
import PlanItem from './PlanItem';
import { useUserReports } from '@/features/reports/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';

export type PlanItem = {
  id: string;
  task: string;
  subtask?: string;
  text?: string;
};

type TaskPlanItem = {
  taskId: string;
  taskName: string;
  description: string;
};

export default function TodayPlan({ items }: { items: PlanItem[] }) {
  const [selectedTask, setSelectedTask] = useState<{ name: string; description: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const userId = getUserId();

  // Получаем последний отчет пользователя
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useUserReports(userId, 1, 1, hasCreds);

  // Извлекаем plan_tomorrow из первого отчета
  const planItems = useMemo(() => {
    if (!reportsData?.reports?.[0]?.plan_tomorrow) return [];
    return reportsData.reports[0].plan_tomorrow.map((item: any) => ({
      taskId: item.task_id,
      description: item.description || '',
    }));
  }, [reportsData]);

  // Объединяем данные задач с планами
  const taskPlanItems: TaskPlanItem[] = useMemo(() => {
    if (!planItems.length) return [];
    
    return planItems.map((planItem: any) => ({
      taskId: planItem.taskId,
      taskName: 'Загрузка...', // Будем обновлять через отдельные запросы
      description: planItem.description,
    }));
  }, [planItems]);

  const handleTaskClick = (taskName: string, description: string) => {
    setSelectedTask({ name: taskName, description });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTask(null);
  };

  // Если загружаемся, показываем индикатор загрузки
  if (reportsLoading) {
    return (
      <Panel className="p-5 h-full flex flex-col t-surface">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">План из вашего прошлого отчета</h2>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-slate-400">Загрузка планов...</div>
        </div>
      </Panel>
    );
  }

  // Если есть ошибка, показываем её
  if (reportsError) {
    return (
      <Panel className="p-5 h-full flex flex-col t-surface">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">План из вашего прошлого отчета</h2>
        </div>
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-red-400">Ошибка загрузки: {reportsError.message}</div>
        </div>
      </Panel>
    );
  }

  // Если нет авторизации, показываем мок данные
  if (!hasCreds) {
    return (
      <Panel className="p-5 h-full flex flex-col t-surface">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">План из вашего прошлого отчета</h2>
        </div>

        <div className="flex-1 min-h-0">
          {items.length ? (
            <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
              {items.map((p) => (
                <li
                  key={p.id}
                  className="rounded-xl px-4 py-2  backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 ring-1 ring-white/10"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-medium">{p.task}</div>
                    {p.subtask && (
                      <span className="text-s rounded-lg px-5 py-0.5 ring-1 bg-emerald-500/10 text-emerald-300">
                        {p.subtask}
                      </span>
                    )}
                  </div>
                  {p.text && (
                    <div className="text-slate-400 text-sm mt-0.5">{p.text}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid h-full place-items-center rounded-xl bg-[#141c2f] ring-1 ring-white/10 text-slate-400">
              Вы не составили план в прошлом отчете
            </div>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <Panel className="p-5 h-full flex flex-col t-surface">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold">План из вашего прошлого отчета</h2>
      </div>

      <div className="flex-1 min-h-0">
        {taskPlanItems.length ? (
          <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
            {taskPlanItems.map((item) => (
              <PlanItem
                key={item.taskId}
                taskId={item.taskId}
                description={item.description}
                onClick={handleTaskClick}
              />
            ))}
          </ul> 
        ) : (
          <div className="grid h-full place-items-center rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 ring-1 ring-white/10 text-slate-400">
            {reportsData ? 'Вы не составили план в прошлом отчете' : 'Нет данных отчетов'}
          </div>
        )}
      </div>

      <TaskDetailModal
        open={showModal}
        onClose={handleCloseModal}
        taskName={selectedTask?.name || ''}
        taskDescription={selectedTask?.description || ''}
      />
    </Panel>
  );
}
