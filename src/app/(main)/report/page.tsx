'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import Panel from '@/components/ui/Panel';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import ReportProjectPicker from '@/components/ReportProjectPicker';
import SlideTrack from '@/components/ReportWizard/SlideTrack';
import WizardNav from '@/components/ReportWizard/WizardNav';
import NotesForm from '@/components/ReportWizard/NotesForm';
import FinalQuestions from '@/components/ReportWizard/FinalQuestions';
import SuccessModal from '@/components/ReportWizard/SuccessModal';
import { useAllReports, useCreateReport } from '@/features/reports/hooks';
import type { UIReport } from '@/features/reports/api';
import { Employee } from '@/lib/types';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { TaskInfo } from '@/components/ReportProjectPicker';
import { useImproveTaskReport } from '@/features/tasks/hooks';
import { fetchTaskById, fetchTaskBoardProject } from '@/features/tasks/api';
import { fetchBoardById } from '@/features/boards/api';
import { fetchProjectById } from '@/features/projects/api';

const REPORTS_PAGE_SIZE = 20;

type Notes = Record<string, string>;

type ReportGroup = {
  key: string;
  label: string;
  reports: UIReport[];
};

type ReportWizardViewProps = {
  onClose: () => void;
  onCreated: () => void;
};

type ReportDetailsModalProps = {
  report: UIReport | null;
  onClose: () => void;
};

const MARKDOWN_REMARK_PLUGINS = [remarkGfm];

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 last:mb-0 first:mt-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed text-slate-100">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="ml-4 list-decimal space-y-1 text-sm leading-relaxed text-slate-100">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">{children}</li>
  ),
  strong: ({ children }) => <strong className="font-semibold text-slate-50">{children}</strong>,
  em: ({ children }) => <em className="italic text-slate-200">{children}</em>,
  code: ({ children }) => (
    <code className="rounded bg-black/40 px-1 py-0.5 text-xs text-emerald-200">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-emerald-400/70 pl-3 italic text-slate-200">
      {children}
    </blockquote>
  ),
};

const taskInfoCache = new Map<string, TaskInfo>();

async function loadTaskInfo(taskId: string, boardHint?: string): Promise<TaskInfo> {
  const trimmedId = taskId.trim();
  if (taskInfoCache.has(trimmedId)) {
    return taskInfoCache.get(trimmedId)!;
  }

  let taskTitle = trimmedId.length > 0 ? `Задача ${trimmedId}` : 'Неизвестная задача';
  let boardIdForLookup = boardHint?.trim();
  let boardName: string | undefined;
  let projectId: string | undefined;
  let projectName: string | undefined;

  try {
    const task = await fetchTaskById(trimmedId);
    console.log('loadTaskInfo: fetchTaskById result for', trimmedId, task);
    if (task && typeof task === 'object') {
      const taskData = task as Record<string, unknown>;
      const titleCandidate = taskData.name ?? taskData.title;
      if (typeof titleCandidate === 'string' && titleCandidate.trim().length > 0) {
        taskTitle = titleCandidate.trim();
      }

      const status = taskData.status;
      const boardCandidate = typeof status === 'object' && status !== null
        ? ((status as Record<string, unknown>).board ?? undefined)
        : taskData.board;

      if (boardCandidate && typeof boardCandidate === 'object') {
        const boardObj = boardCandidate as Record<string, unknown>;
        const boardIdCandidate = boardObj.id ?? boardObj.board_id ?? boardObj.boardId;
        const boardNameCandidate = boardObj.name;
        const projectIdCandidate = boardObj.project_id ?? boardObj.projectId;

        if (!boardIdForLookup && (typeof boardIdCandidate === 'string' || typeof boardIdCandidate === 'number')) {
          boardIdForLookup = String(boardIdCandidate);
        }

        if (typeof boardNameCandidate === 'string' && boardNameCandidate.trim().length > 0) {
          boardName = boardNameCandidate.trim();
        }

        if (typeof projectIdCandidate === 'string' || typeof projectIdCandidate === 'number') {
          projectId = String(projectIdCandidate);
        }
      }

      const projectCandidate = taskData.project;
      if (!projectId && projectCandidate && typeof projectCandidate === 'object') {
        const projectObj = projectCandidate as Record<string, unknown>;
        const projectIdCandidate = projectObj.id ?? projectObj.project_id ?? projectObj.projectId;
        if (typeof projectIdCandidate === 'string' || typeof projectIdCandidate === 'number') {
          projectId = String(projectIdCandidate);
        }
        const projectNameCandidate = projectObj.name;
        if (typeof projectNameCandidate === 'string' && projectNameCandidate.trim().length > 0) {
          projectName = projectNameCandidate.trim();
        }
      }
    }
  } catch (error) {
    console.warn('Не удалось получить данные задачи через fetchTaskById', trimmedId, error);
  }

  // Если не удалось получить board/project из fetchTaskById, попробуем через fetchTaskBoardProject
  if ((!boardIdForLookup || !projectId) && !boardName) {
    try {
      const boardProjectInfo = await fetchTaskBoardProject(trimmedId);
      console.log('loadTaskInfo: fetchTaskBoardProject result for', trimmedId, boardProjectInfo);
      if (boardProjectInfo.boardId && !boardIdForLookup) {
        boardIdForLookup = boardProjectInfo.boardId;
      }
      if (boardProjectInfo.projectId && !projectId) {
        projectId = boardProjectInfo.projectId;
      }
    } catch (error) {
      console.warn('Не удалось получить данные доски и проекта через fetchTaskBoardProject', trimmedId, error);
    }
  }

  if ((!boardName || !projectId) && boardIdForLookup) {
    try {
      const board = await fetchBoardById(boardIdForLookup);
      if (board) {
        if (!boardName && typeof board.name === 'string' && board.name.trim().length > 0) {
          boardName = board.name.trim();
        }
        const boardRecord = board as Record<string, unknown>;
        const boardProjectId = boardRecord.projectId ?? boardRecord.project_id;
        if (!projectId && (typeof boardProjectId === 'string' || typeof boardProjectId === 'number')) {
          const candidate = String(boardProjectId).trim();
          if (candidate.length > 0) {
            projectId = candidate;
          }
        }
      }
    } catch (error) {
      console.warn('Не удалось получить данные доски', boardIdForLookup, error);
    }
  }

  if (projectId && !projectName) {
    try {
      const project = await fetchProjectById(projectId);
      if (project && typeof project.name === 'string' && project.name.trim().length > 0) {
        projectName = project.name.trim();
      }
    } catch (error) {
      console.warn('Не удалось получить данные проекта', projectId, error);
    }
  }

  const result: TaskInfo = {
    taskTitle,
    boardName: boardName ?? (boardIdForLookup ? `Доска ${boardIdForLookup}` : 'Неизвестная доска'),
    projectName: projectName ?? (projectId ? `Проект ${projectId}` : 'Неизвестный проект'),
  };

  taskInfoCache.set(trimmedId, result);
  console.log('loadTaskInfo: final result for', trimmedId, result);
  return result;
}

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="space-y-2">
      <ReactMarkdown
        remarkPlugins={MARKDOWN_REMARK_PLUGINS}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default function ReportsPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const [page, setPage] = useState(1);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedReport, setSelectedReport] = useState<UIReport | null>(null);

  const { data, isLoading, error, refetch } = useAllReports(page, REPORTS_PAGE_SIZE, hasCreds);

  const groups = useMemo<ReportGroup[]>(() => {
    if (!data?.items) return [];

    const byDate = new Map<string, UIReport[]>();
    data.items.forEach((report) => {
      const key = normalizeDateKey(report.reportDate ?? report.createdAt);
      if (!byDate.has(key)) {
        byDate.set(key, []);
      }
      byDate.get(key)!.push(report);
    });

    return Array.from(byDate.entries())
      .sort((a, b) => compareDateKeys(b[0], a[0]))
      .map(([key, reports]) => ({
        key,
        label: formatDateLabel(key),
        reports: reports.sort((first, second) => (first.user.name ?? '').localeCompare(second.user.name ?? '', 'ru', { sensitivity: 'base' })),
      }));
  }, [data]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / Math.max(1, data.pageSize))) : 1;

  const handleWizardClose = useCallback(() => {
    setShowWizard(false);
  }, []);

  const handleReportCreated = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <main className="min-h-screen text-white">
      {showWizard ? (
        <ReportWizardView
          onClose={handleWizardClose}
          onCreated={() => {
            handleReportCreated();
            handleWizardClose();
          }}
        />
      ) : (
        <div className="mx-auto max-w-6xl p-6 space-y-6">
          <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between p-6">
            <div>
              <h1 className="text-2xl font-semibold">Отчёты команды</h1>
              <p className="text-sm text-slate-300">Просматривайте ежедневные отчёты сотрудников и переходите к деталям одним кликом.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowWizard(true)}
              className="self-start rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black transition hover:brightness-110"
            >
              Создать отчёт
            </button>
          </Panel>

          {!hasCreds ? (
            <Panel className="p-6">
              <div className="text-slate-300">Чтобы просматривать отчёты, войдите в систему.</div>
            </Panel>
          ) : isLoading ? (
            <Panel className="p-6">
              <div className="text-slate-300">Загрузка отчётов…</div>
            </Panel>
          ) : error ? (
            <Panel className="p-6">
              <div className="text-red-400">Не удалось загрузить отчёты. Попробуйте обновить страницу.</div>
            </Panel>
          ) : groups.length === 0 ? (
            <Panel className="p-6">
              <div className="text-slate-300">Отчётов пока нет.</div>
            </Panel>
          ) : (
            groups.map((group) => (
              <Panel key={group.key} className="space-y-4 p-6">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-xl font-semibold">{group.label}</h2>
                  <span className="text-sm text-slate-400">Отчётов: {group.reports.length}</span>
                </div>
                <div className="grid gap-3">
                  {group.reports.map((report) => (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => setSelectedReport(report)}
                      className="flex w-full flex-col gap-2 rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={report.user.name}
                          url={report.user.avatarUrl}
                          email={report.user.email}
                          fallbackKey={report.user.id ?? report.user.name}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <div className="truncate text-base font-semibold text-white">{report.user.name}</div>
                        </div>
                      </div>
                      <div className="text-sm text-slate-200">
                        <span className="mr-4">Выполнено: <span className="font-semibold">{report.completedWork.length}</span></span>
                        <span className="mr-4">План: <span className="font-semibold">{report.tomorrowPlans.length}</span></span>
                        <span className="mr-4">Помощь: <span className="font-semibold">{report.helpRequests.length}</span></span>
                        <span>Проблемы: <span className="font-semibold">{report.problems.length}</span></span>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
            ))
          )}

          {hasCreds && groups.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Предыдущая страница
              </button>
              <div className="text-sm text-slate-300">Страница {page} из {totalPages}</div>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Следующая страница
              </button>
            </div>
          )}
        </div>
      )}

      <ReportDetailsModal report={selectedReport} onClose={() => setSelectedReport(null)} />
    </main>
  );
}

function ReportWizardView({ onClose, onCreated }: ReportWizardViewProps) {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();

  const [selectedDone, setSelectedDone] = useState<Set<string>>(new Set());
  const [selectedPlan, setSelectedPlan] = useState<Set<string>>(new Set());
  const [doneNotes, setDoneNotes] = useState<Notes>({});
  const [planNotes, setPlanNotes] = useState<Notes>({});
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [needHelp, setNeedHelp] = useState<'yes' | 'no' | null>(null);
  const [helpComments, setHelpComments] = useState<Record<string, string>>({});
  const [selectedHelpers, setSelectedHelpers] = useState<Employee[]>([]);
  const [reportDate, setReportDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [step, setStep] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [taskMap, setTaskMap] = useState<Map<string, TaskInfo>>(new Map());
  const improveReportMutation = useImproveTaskReport();
  const createReportMutation = useCreateReport();
  const [improvingKey, setImprovingKey] = useState<string | null>(null);
  const [pickerResetToken, setPickerResetToken] = useState(0);

  const updateTaskMap = useCallback((newTaskMap: Map<string, TaskInfo>) => {
    setTaskMap((prev) => {
      const combined = new Map(prev);
      newTaskMap.forEach((value, key) => {
        combined.set(key, value);
      });
      return combined;
    });
  }, []);

  const allSelectedKeys = useMemo(() => {
    const keys = new Set<string>();
    selectedDone.forEach((key) => keys.add(key));
    selectedPlan.forEach((key) => keys.add(key));
    return Array.from(keys);
  }, [selectedDone, selectedPlan]);

  const missingTaskKeys = useMemo(() => {
    return allSelectedKeys.filter((key) => !taskMap.has(key));
  }, [allSelectedKeys, taskMap]);

  const resolveTaskInfo = useCallback(async (key: string): Promise<TaskInfo | null> => {
    const parts = key.split(':');
    const boardPart = parts.length > 1 ? parts[0] : undefined;
    const taskPart = parts.length > 1 ? parts[1] : parts[0];
    const taskId = taskPart?.trim();

    if (!taskId) {
      return null;
    }

    try {
      return await loadTaskInfo(taskId, boardPart?.trim());
    } catch (error) {
      console.warn('Не удалось получить информацию о задаче', key, error);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!hasCreds) return;
    if (missingTaskKeys.length === 0) return;
    let cancelled = false;

    const load = async () => {
      const updates = new Map<string, TaskInfo>();
      for (const key of missingTaskKeys) {
        try {
          const info = await resolveTaskInfo(key);
          if (info) {
            updates.set(key, info);
          }
        } catch (error) {
          console.error('Ошибка при дозагрузке информации о задаче', key, error);
        }
        if (cancelled) {
          return;
        }
      }

      if (!cancelled && updates.size > 0) {
        setTaskMap((prev) => {
          const merged = new Map(prev);
          updates.forEach((value, key) => merged.set(key, value));
          return merged;
        });
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [missingTaskKeys, hasCreds, resolveTaskInfo]);

  const doneKeys = useMemo(() => Array.from(selectedDone), [selectedDone]);
  const parseTaskKey = useCallback((key: string): { boardId: string | null; taskId: string | null } => {
    if (!key) return { boardId: null, taskId: null };
    const parts = key.split(':');
    if (parts.length === 1) {
      const taskId = parts[0]?.trim() ?? '';
      return { boardId: null, taskId: taskId.length > 0 ? taskId : null };
    }
    const boardId = parts[0]?.trim() ?? '';
    const taskId = parts[1]?.trim() ?? '';
    return {
      boardId: boardId.length > 0 ? boardId : null,
      taskId: taskId.length > 0 ? taskId : null,
    };
  }, []);

  const resolveTaskId = useCallback((key: string) => {
    const { taskId } = parseTaskKey(key);
    const fallback = key.includes(':') ? key.split(':')[1] : key;
    const candidate = (taskId ?? fallback).trim();
    return candidate.length > 0 ? candidate : undefined;
  }, [parseTaskKey]);

  const planKeys = useMemo(() => Array.from(selectedPlan), [selectedPlan]);
  const stepsCount = 1 + doneKeys.length + 1 + planKeys.length + 1;

  useEffect(() => {
    if (step > stepsCount - 1) setStep(stepsCount - 1);
  }, [stepsCount, step]);

  const resetWizardState = useCallback(() => {
    setSelectedDone(new Set());
    setSelectedPlan(new Set());
    setDoneNotes({});
    setPlanNotes({});
    setSelectedProblems(new Set());
    setNeedHelp(null);
    setHelpComments({});
    setSelectedHelpers([]);
    setReportDate(() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    });
    setStep(0);
    setTaskMap(new Map());
    setImprovingKey(null);
    setShowSuccessModal(false);
    setPickerResetToken((prev) => prev + 1);
  }, []);

  const handleClose = useCallback(() => {
    resetWizardState();
    onClose();
  }, [onClose, resetWizardState]);

  const toggleDone = (boardId: string, taskId: string) => {
    setSelectedDone((prev) => {
      const next = new Set(prev);
      const key = `${boardId}:${taskId}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const togglePlan = (boardId: string, taskId: string) => {
    setSelectedPlan((prev) => {
      const next = new Set(prev);
      const key = `${boardId}:${taskId}`;
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleProblem = (problemId: string) => {
    setSelectedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  };

  const renderTaskLabel = (key: string) => {
    const taskInfo = taskMap.get(key);
    if (taskInfo) {
      return `${taskInfo.projectName} — ${taskInfo.boardName} — ${taskInfo.taskTitle}`;
    }
    return 'Загрузка информации о задаче...';
  };

  const selectHelpers = (helpers: Employee[]) => {
    setSelectedHelpers(helpers);
  };

  const handleImprove = useCallback(async (key: string, currentText: string) => {
    const parts = key.split(':');
    const taskId = parts.length > 1 ? parts[1] : parts[0];
    if (!taskId) {
      console.warn('Report wizard: нет taskId для улучшения', key);
      return;
    }

    setImprovingKey(key);
    try {
      const result = await improveReportMutation.mutateAsync({
        taskId,
        userText: currentText,
      });
      const improvedText = typeof result?.improved_text === 'string' && result.improved_text.trim().length > 0
        ? result.improved_text
        : currentText;
      setDoneNotes((prev) => ({
        ...prev,
        [key]: improvedText,
      }));
    } catch (error) {
      console.error('Ошибка при генерации комментария отчёта', error);
      alert('Не удалось сгенерировать комментарий. Попробуйте позже.');
    } finally {
      setImprovingKey((prev) => (prev === key ? null : prev));
    }
  }, [improveReportMutation]);

  const handleSubmit = async () => {
    const userId = getUserId();
    if (!userId) {
      alert('Ошибка: пользователь не авторизован');
      return;
    }

    try {
      const completeWork = doneKeys.map((key) => {
        const resolvedTaskId = resolveTaskId(key);
        return {
          task_id: resolvedTaskId ?? '',
          description: doneNotes[key] || '',
        };
      });

      const planTomorrow = planKeys
        .map((key) => {
          const note = (planNotes[key] ?? '').trim();
          if (!note) {
            return null;
          }
          const resolvedTaskId = resolveTaskId(key);
          return {
            description: note,
            ...(resolvedTaskId ? { task_id: resolvedTaskId } : {}),
          };
        })
        .filter((plan): plan is { description: string; task_id?: string } => plan !== null);

      console.log('Plan data:', { planKeys, planNotes, planTomorrow });

      const helpRequests = selectedHelpers.map((helper) => ({
        helper_id: helper.id,
        description: helpComments[helper.id] || '',
        status: 'pending',
      }));

      // Создаем дату в UTC, чтобы избежать проблем с часовыми поясами
      const [year, month, day] = reportDate.split('-').map(Number);
      const reportDateISO = new Date(Date.UTC(year, month - 1, day)).toISOString();

      const payload = {
        complete_work: completeWork,
        help: helpRequests,
        plan_tomorrow: planTomorrow,
        problems: Array.from(selectedProblems),
        report_date: reportDateISO,
        user_id: userId,
      };

      console.log('Creating report with payload:', payload);

      await createReportMutation.mutateAsync(payload);

      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка при создании отчета:', error);
      alert('Ошибка при создании отчета. Попробуйте еще раз.');
    }
  };

  const handleSuccessClose = () => {
    onCreated();
    handleClose();
  };

  if (!hasCreds) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-slate-300">
        Для создания отчёта необходимо авторизоваться.
      </div>
    );
  }

  const steps: React.ReactNode[] = [];
  let idx = 0;

  const goToStep = (index: number) => {
    const safe = Math.max(0, Math.min(index, stepsCount - 1));
    setStep(safe);
    // Автопрокрутка вверх при переключении шагов
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 0: выбор задач, над которыми работали
  const firstStepIndex = idx;
  steps.push(
    <div key={`slide-${firstStepIndex}`} className="flex flex-col justify-between">
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
        <ReportProjectPicker
          key={`done-${pickerResetToken}`}
          selected={selectedDone}
          onToggle={toggleDone}
          onTaskInfoUpdate={updateTaskMap}
          title="Выберите задачи, по которым вы сегодня работали"
          description="Выберите задачи из ваших проектов и досок."
        />
      </div>
      <WizardNav onNext={() => selectedDone.size > 0 && goToStep(firstStepIndex + 1)} nextDisabled={selectedDone.size === 0} />
    </div>
  );
  idx += 1;

  doneKeys.forEach((key) => {
    const index = idx;
    steps.push(
      <div key={`slide-${index}`} className="flex flex-col justify-between">
        <NotesForm
          title="Напишите, что вы сделали по задаче:"
          taskLabel={renderTaskLabel(key)}
          value={doneNotes[key] ?? ''}
          placeholder="Опишите выполненную работу…"
          onChange={(value) => setDoneNotes((prev) => ({ ...prev, [key]: value }))}
          onImproveClick={() => { void handleImprove(key, doneNotes[key] ?? ''); }}
          isImproving={improvingKey === key && improveReportMutation.isPending}
        />
        <WizardNav onPrev={() => goToStep(index - 1)} onNext={() => goToStep(index + 1)} />
      </div>
    );
    idx += 1;
  });

  const planPickerIndex = idx;
  steps.push(
    <div key={`slide-${planPickerIndex}`} className="flex flex-col justify-between">
      <div className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6">
        <ReportProjectPicker
          key={`plan-${pickerResetToken}`}
          selected={selectedPlan}
          onToggle={togglePlan}
          onTaskInfoUpdate={updateTaskMap}
          title="Выберите задачи для плана на завтра"
          description="Выберите задачи из ваших проектов и досок."
        />
      </div>
      <WizardNav onPrev={() => goToStep(planPickerIndex - 1)} onNext={() => selectedPlan.size > 0 && goToStep(planPickerIndex + 1)} nextDisabled={selectedPlan.size === 0} />
    </div>
  );
  idx += 1;

  planKeys.forEach((key) => {
    const index = idx;
    steps.push(
      <div key={`slide-${index}`} className="flex flex-col justify-between">
        <NotesForm
          title="План на завтра по задаче:"
          taskLabel={renderTaskLabel(key)}
          value={planNotes[key] ?? ''}
          placeholder="Что планируете сделать завтра…"
          onChange={(value) => setPlanNotes((prev) => ({ ...prev, [key]: value }))}
        />
        <WizardNav onPrev={() => goToStep(index - 1)} onNext={() => goToStep(index + 1)} />
      </div>
    );
    idx += 1;
  });

  const finalStepIndex = idx;
  steps.push(
    <div key={`slide-${finalStepIndex}`} className="flex flex-col justify-between">
      <FinalQuestions
        selectedProblems={selectedProblems}
        onToggleProblem={toggleProblem}
        needHelp={needHelp}
        setNeedHelp={setNeedHelp}
        helpComments={helpComments}
        setHelpComments={setHelpComments}
        onHelpersChange={selectHelpers}
        reportDate={reportDate}
        setReportDate={setReportDate}
      />
      <WizardNav
        onPrev={() => goToStep(finalStepIndex - 1)}
        onFinish={() => { void handleSubmit(); }}
        isLoading={createReportMutation.isPending}
      />
    </div>
  );

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            Назад к списку отчётов
          </button>
        </div>

        <SlideTrack step={step}>{steps}</SlideTrack>
      </div>

      <SuccessModal open={showSuccessModal} onClose={handleSuccessClose} />
    </div>
  );
}

function ReportDetailsModal({ report, onClose }: ReportDetailsModalProps) {
  const [taskInfo, setTaskInfo] = useState<Record<string, TaskInfo>>({});
  const [tasksLoading, setTasksLoading] = useState(false);

  useEffect(() => {
    if (!report) {
      setTaskInfo({});
      setTasksLoading(false);
      return;
    }

    const uniqueTaskIds = new Set<string>();
    report.completedWork.forEach((item) => {
      const id = item.taskId?.trim();
      if (id) uniqueTaskIds.add(id);
    });
    report.tomorrowPlans.forEach((item) => {
      const id = item.taskId?.trim();
      if (id) uniqueTaskIds.add(id);
    });

    console.log('ReportDetailsModal: uniqueTaskIds', Array.from(uniqueTaskIds));
    console.log('ReportDetailsModal: report.completedWork', report.completedWork);
    console.log('ReportDetailsModal: report.tomorrowPlans', report.tomorrowPlans);
    console.log('ReportDetailsModal: report.helpRequests', report.helpRequests);
    console.log('ReportDetailsModal: report.problems', report.problems);

    if (uniqueTaskIds.size === 0) {
      setTaskInfo({});
      setTasksLoading(false);
      return;
    }

    let cancelled = false;
    setTasksLoading(true);

    const load = async () => {
      const entries: Record<string, TaskInfo> = {};
      try {
        for (const id of uniqueTaskIds) {
          if (cancelled) {
            return;
          }
          try {
            entries[id] = await loadTaskInfo(id);
          } catch (error) {
            console.warn('Не удалось загрузить информацию о задаче отчёта', id, error);
          }
        }

        if (!cancelled) {
          setTaskInfo((prev) => ({ ...prev, ...entries }));
        }
      } finally {
        if (!cancelled) {
          setTasksLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [report]);

  if (!report) return null;

  const safeMarkdown = (value?: string) => (value && value.trim().length > 0 ? value : '_Без описания_');

  const renderTaskMeta = (taskId?: string) => {
    if (!taskId) {
      return (
        <div className="mt-2 text-xs text-slate-400">
          Задача не указана
        </div>
      );
    }
    const info = taskInfo[taskId];
    console.log('renderTaskMeta: taskId', taskId, 'info', info);
    if (!info) {
      return (
        <div className="mt-2 text-xs text-slate-400">
          Загрузка информации о задаче: {taskId}
        </div>
      );
    }
    return (
      <div className="mt-2 space-y-1 text-xs text-emerald-200">
        <div className="text-sm font-semibold text-emerald-100">{info.taskTitle}</div>
        <div>{info.projectName} • {info.boardName}</div>
      </div>
    );
  };

  return (
    <Modal open onClose={onClose}>
      <div className="w-full max-w-3xl">
        <div className="max-h-[85vh] space-y-6 overflow-y-auto rounded-2xl bg-emerald-950/95 p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold">{report.user.name}</div>
              <div className="text-sm text-slate-300">{formatDateTime(report.reportDate ?? report.createdAt)}</div>
            </div>
            <Avatar name={report.user.name} url={report.user.avatarUrl} email={report.user.email} fallbackKey={report.user.id ?? report.user.name} size="md" />
          </div>

          {tasksLoading && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs text-emerald-200">
              Загрузка информации о задачах…
            </div>
          )}

          <ReportDetailSection title="Выполненная работа" emptyLabel="Нет выполненных задач">
            {report.completedWork.length > 0 ? (
              <ul className="space-y-3">
                {report.completedWork.map((item, index) => (
                  <li key={item.id ?? item.taskId ?? index} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <MarkdownBlock content={safeMarkdown(item.description)} />
                    {renderTaskMeta(item.taskId)}
                  </li>
                ))}
              </ul>
            ) : null}
          </ReportDetailSection>

          <ReportDetailSection title="План на завтра" emptyLabel="План отсутствует">
            {report.tomorrowPlans.length > 0 ? (
              <ul className="space-y-3">
                {report.tomorrowPlans.map((item, index) => (
                  <li key={item.id ?? item.taskId ?? index} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <MarkdownBlock content={safeMarkdown(item.description)} />
                    {renderTaskMeta(item.taskId)}
                  </li>
                ))}
              </ul>
            ) : null}
          </ReportDetailSection>

          <ReportDetailSection title="Запросы помощи" emptyLabel="Запросов помощи нет">
            {report.helpRequests.length > 0 ? (
              <ul className="space-y-3">
                {report.helpRequests.map((item, index) => (
                  <li key={item.id ?? item.helperId ?? index} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <MarkdownBlock content={safeMarkdown(item.description)} />
                    <div className="mt-2 text-xs text-slate-300">Статус: {item.status || 'pending'}</div>
                  </li>
                ))}
              </ul>
            ) : null}
          </ReportDetailSection>

          <ReportDetailSection title="Проблемы" emptyLabel="Проблем не указано">
            {report.problems.length > 0 ? (
              <ul className="space-y-3">
                {report.problems.map((item, index) => (
                  <li key={item.id ?? index} className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                    <div className="text-sm font-semibold text-slate-100">{item.name || 'Без названия'}</div>
                    <div className="mt-2">
                      <MarkdownBlock content={item.description.length > 0 ? item.description.join('\n') : '_Описание отсутствует_'} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </ReportDetailSection>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ReportDetailSection({ title, emptyLabel, children }: { title: string; emptyLabel: string; children: React.ReactNode | null }) {
  const hasContent = children !== null;
  return (
    <section className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      {hasContent ? children : <div className="text-sm text-slate-300">{emptyLabel}</div>}
    </section>
  );
}

function normalizeDateKey(raw?: string) {
  if (!raw) return 'unknown';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toISOString().split('T')[0];
}

function compareDateKeys(a: string, b: string) {
  if (a === b) return 0;
  if (a === 'unknown') return 1;
  if (b === 'unknown') return -1;
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) {
    return b.localeCompare(a);
  }
  return dateA.getTime() - dateB.getTime();
}

function formatDateLabel(key: string) {
  if (!key || key === 'unknown') {
    return 'Без даты';
  }
  const date = new Date(key);
  if (Number.isNaN(date.getTime())) {
    const altDate = new Date(Date.parse(key));
    if (!Number.isNaN(altDate.getTime())) {
      return withWeekdayLabel(altDate);
    }
    return key;
  }
  return withWeekdayLabel(date);
}

function formatDateTime(value?: string) {
  if (!value) return 'Дата не указана';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function withWeekdayLabel(date: Date) {
  const base = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
  const weekday = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
  }).format(date);
  return `${base}, ${weekday}`;
}
