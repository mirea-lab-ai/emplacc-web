'use client';

import { useState, useMemo } from 'react';
import Panel from '@/components/ui/Panel';
import TaskDetailModal from './TaskDetailModal';
import PlanItem from './PlanItem';
import { useUserReports } from '@/features/reports/hooks';
import { useTasksByIds } from '@/features/tasks/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';

export type PlanItem = {
  id: string;
  task: string;
  subtask?: string;
  text?: string;
};

type TaskPlanItem = {
  planId: string;
  boardId: string | null;
  taskId: string;
  description: string;
};

const CLOSED_STATUS_KEYWORDS = ['done', 'completed', 'готов', 'закрыт', 'выполн'];

function isStatusClosed(status: any): boolean {
  if (!status) return false;
  if (typeof status.is_open === 'boolean') {
    return status.is_open === false;
  }
  if (typeof status.is_active === 'boolean') {
    return status.is_active === false;
  }
  const raw = String(status.name ?? status.key ?? '').trim().toLowerCase();
  if (!raw) return false;
  return CLOSED_STATUS_KEYWORDS.some((keyword) => raw.includes(keyword));
}

export default function TodayPlan({ items }: { items: PlanItem[] }) {
  const [selectedTask, setSelectedTask] = useState<{ name: string; description: string } | null>(null);
  const [showModal, setShowModal] = useState(false);

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const userId = getUserId();

  // Получаем последний отчет пользователя
  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useUserReports(userId, 1, 1, hasCreds);

  // Извлекаем plan_tomorrow из первого отчета
  const planItems = useMemo((): Array<{ raw: unknown }> => {
    if (!reportsData?.reports?.[0]?.plan_tomorrow) return [];
    return reportsData.reports[0].plan_tomorrow.map((item: unknown) => ({
      raw: item,
    }));
  }, [reportsData]);

  // Объединяем данные задач с планами
  const taskPlanItems: TaskPlanItem[] = useMemo(() => {
    if (!planItems.length) return [];

    const result: TaskPlanItem[] = [];
    planItems.forEach((planItem) => {
      const raw: any = planItem.raw;
      const rawId = typeof raw?.id === 'string' ? raw.id : '';
      const taskIdFromRaw = typeof raw?.task_id === 'string' ? raw.task_id : undefined;
      const parts = rawId.includes(':') ? rawId.split(':') : [];
      const boardIdFromId = parts.length === 2 ? parts[0] : undefined;
      const taskIdFromId = parts.length === 2 ? parts[1] : undefined;
      const boardId = typeof raw?.board_id === 'string' && raw.board_id ? raw.board_id : boardIdFromId ?? null;
      const taskId = taskIdFromRaw ?? taskIdFromId;

      if (!taskId) {
        return;
      }

      result.push({
        planId: rawId || `${boardId ?? 'plan'}:${taskId}`,
        boardId,
        taskId: String(taskId),
        description: typeof raw?.description === 'string' ? raw.description : '',
      });
    });

    return result;
  }, [planItems]);

  const taskIds = useMemo(() => taskPlanItems.map((item) => item.taskId), [taskPlanItems]);
  const taskQueries = useTasksByIds(taskIds, hasCreds && taskIds.length > 0);

  let closedTasksCount = 0;
  const combinedPlan = taskPlanItems.map((planItem, index) => {
    const query = taskQueries[index];
    const data = query?.data as any | undefined;
    const statuses: any[] = Array.isArray(data?.statuses) ? data.statuses : [];
    const statusIdFromTask = data?.status_id ?? data?.statusId ?? data?.status?.id ?? null;
    let statusContainingTask = statuses.find((status) =>
      Array.isArray(status?.tasks) && status.tasks.some((task: any) => String(task?.id) === planItem.taskId)
    );
    if (!statusContainingTask && statusIdFromTask != null) {
      statusContainingTask = statuses.find((status) => String(status?.id) === String(statusIdFromTask));
    }
    const taskIsClosed = statusContainingTask ? isStatusClosed(statusContainingTask) : false;
    const loading = !data && query?.isLoading;
    const resolvedName = typeof data?.name === 'string' && data.name.trim().length > 0
      ? data.name
      : loading
        ? 'Загрузка...'
        : query?.isError
          ? 'Не удалось загрузить задачу'
          : 'Задача не найдена';
    let isClosed = taskIsClosed;

    if (!isClosed && statusContainingTask == null) {
      isClosed = statuses.some((status) => isStatusClosed(status));
    }

    if (isClosed) {
      closedTasksCount += 1;
    }

    const helperText = query?.isError
      ? 'Не удалось получить информацию о задаче'
      : isClosed
        ? 'Задача уже в завершенном статусе'
        : null;

    return {
      taskId: planItem.taskId,
      boardId: planItem.boardId,
      description: planItem.description,
      taskName: resolvedName,
      loading: Boolean(loading),
      isClosed,
      helperText,
      planId: planItem.planId,
    };
  });

  const visibleTasks = combinedPlan.filter((item) => {
    if (!item.taskId) {
      return true;
    }
    if (item.loading) {
      return true;
    }
    return !item.isClosed;
  });

  const allTasksClosed = taskPlanItems.length > 0 && visibleTasks.length === 0;

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
        {visibleTasks.length ? (
          <>
            {closedTasksCount > 0 && (
              <div className="text-xs text-emerald-200/80 px-1 mb-2">
                Скрыто {closedTasksCount} завершенных задач из плана
              </div>
            )}
            <ul className="space-y-2 h-full overflow-auto pr-1 custom-scroll">
              {visibleTasks.map((item) => (
                <PlanItem
                  key={item.planId}
                  taskName={item.taskName}
                  description={item.description}
                  loading={item.loading}
                  disabled={item.isClosed}
                  helperText={item.helperText}
                  onClick={handleTaskClick}
                />
              ))}
            </ul>
          </>
        ) : (
          <div className="grid h-full place-items-center rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 ring-1 ring-white/10 text-slate-400">
            {allTasksClosed
              ? 'Все задачи из плана уже завершены — отлично! Составьте новый план в свежем отчете.'
              : reportsData
                ? 'Вы не составили план в прошлом отчете'
                : 'Нет данных отчетов'}
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
