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
  taskId?: string;
  description: string;
  rawTitle?: string;
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

  const taskPlanItems: TaskPlanItem[] = useMemo(() => {
    const rawData = reportsData as any;
    const reportsArray: any[] = Array.isArray(rawData?.reports)
      ? rawData.reports
      : Array.isArray(rawData?.items)
        ? rawData.items
        : Array.isArray(rawData)
          ? rawData
          : [];
    const latestReport = reportsArray[0] ?? {};
    const rawPlan: unknown[] = Array.isArray(latestReport?.plan_tomorrow)
      ? latestReport.plan_tomorrow
      : Array.isArray(latestReport?.planTomorrow)
        ? latestReport.planTomorrow
        : [];

    return rawPlan.map((item, index) => {
      const raw = item as any;
      const rawId = typeof raw?.id === 'string' ? raw.id : '';
      const rawTaskId = raw?.task_id ?? raw?.taskId ?? raw?.task?.id;
      const taskIdCandidate = typeof rawTaskId === 'number' ? String(rawTaskId) : rawTaskId;
      const taskId = typeof taskIdCandidate === 'string' && taskIdCandidate.trim().length > 0
        ? taskIdCandidate.trim()
        : undefined;

      const descriptionCandidates = [
        typeof raw?.description === 'string' ? raw.description : undefined,
        typeof raw?.text === 'string' ? raw.text : undefined,
        typeof raw?.task === 'string' ? raw.task : undefined,
        typeof raw === 'string' ? raw : undefined,
      ];
      const description =
        descriptionCandidates
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .find((value) => value.length > 0) ?? '';

      const titleCandidates = [
        typeof raw?.name === 'string' ? raw.name : undefined,
        typeof raw?.title === 'string' ? raw.title : undefined,
        typeof raw?.task_name === 'string' ? raw.task_name : undefined,
        typeof raw?.taskTitle === 'string' ? raw.taskTitle : undefined,
        typeof raw?.task === 'string' ? raw.task : undefined,
      ];
      const rawTitle =
        titleCandidates
          .map((value) => (typeof value === 'string' ? value.trim() : ''))
          .find((value) => value.length > 0) || undefined;

      const planId =
        (typeof rawId === 'string' && rawId.trim().length > 0 ? rawId.trim() : null)
        ?? (taskId ? taskId : `plan-${index}`);

      return {
        planId,
        taskId,
        description,
        rawTitle,
      };
    });
  }, [reportsData]);

  const trackedTaskIds = useMemo(
    () => taskPlanItems.map((item) => item.taskId).filter((value): value is string => typeof value === 'string' && value.length > 0),
    [taskPlanItems],
  );

  const taskQueries = useTasksByIds(trackedTaskIds, hasCreds && trackedTaskIds.length > 0);

  const queriesByTaskId = useMemo(() => {
    const map = new Map<string, (typeof taskQueries)[number]>();
    trackedTaskIds.forEach((taskId, index) => {
      map.set(taskId, taskQueries[index]);
    });
    return map;
  }, [taskQueries, trackedTaskIds]);

  let closedTasksCount = 0;
  const combinedPlan = taskPlanItems.map((planItem) => {
    if (!planItem.taskId) {
      return {
        taskId: undefined,
        description: planItem.description,
        taskName: planItem.rawTitle ?? planItem.description ?? 'Пункт плана',
        loading: false,
        isClosed: false,
        helperText: null,
        planId: planItem.planId,
      };
    }

    const query = queriesByTaskId.get(planItem.taskId);
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
    let resolvedName = typeof data?.name === 'string' && data.name.trim().length > 0
      ? data.name
      : planItem.rawTitle && planItem.rawTitle.length > 0
        ? planItem.rawTitle
        : '';
    if (!resolvedName) {
      resolvedName = loading
        ? 'Загрузка...'
        : query?.isError
          ? 'Не удалось загрузить задачу'
          : 'Задача';
    }
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

  const trackedPlanCount = combinedPlan.filter((item) => item.taskId).length;
  const visibleTrackedPlanCount = combinedPlan.filter((item) => item.taskId && (!item.isClosed || item.loading)).length;
  const allTasksClosed = trackedPlanCount > 0 && visibleTrackedPlanCount === 0;

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
          <div className="text-app-2">Загрузка планов...</div>
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
                  className="rounded-xl px-4 py-2  backdrop-blur-sm bg-app-hover border border-app text-app hover:bg-app-hover ring-1 ring-app"
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
                    <div className="text-app-2 text-sm mt-0.5">{p.text}</div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid h-full place-items-center rounded-xl t-surface-elevated ring-1 ring-app text-app-2">
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
          <div className="grid h-full place-items-center rounded-xl backdrop-blur-sm bg-app-hover border border-app ring-1 ring-app text-app-2">
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
