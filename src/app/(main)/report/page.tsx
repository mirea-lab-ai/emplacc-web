'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import Panel from '@/components/ui/Panel';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import ReportProjectPicker from '@/components/ReportProjectPicker';
import FinalQuestions from '@/components/ReportWizard/FinalQuestions';
import SuccessModal from '@/components/ReportWizard/SuccessModal';
import { useAllReports, useCreateReport } from '@/features/reports/hooks';
import type { UIReport } from '@/features/reports/api';
import { Employee } from '@/lib/types';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { useUserRole } from '@/features/roles/hooks';
import { TaskInfo } from '@/components/ReportProjectPicker';
import { useImproveTaskReport, useTasksByIds } from '@/features/tasks/hooks';
import { useToast } from '@/components/ui/Toast';
import { fetchTaskById, fetchTaskBoardProject } from '@/features/tasks/api';
import { fetchBoardById } from '@/features/boards/api';
import { fetchProjectById } from '@/features/projects/api';
import { mapTask, type TaskAssignee, type TaskShort, type UITask, getTaskPriorityMeta } from '@/features/tasks/types';

const REPORTS_PAGE_SIZE = 20;

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

type CombinedTaskDetails = {
  taskId?: string;
  title: string;
  projectName: string;
  boardName: string;
  statusName?: string;
  statusColor?: string;
  priority?: number;
  assignees?: TaskAssignee[];
  description?: string;
  creatorName?: string;
  creatorEmail?: string;
  loading: boolean;
  error?: boolean;
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
const DONE_TASK_NOTE_ERROR = 'Добавьте комментарий к выполненной задаче';
const PLAN_TASK_NOTE_ERROR = 'Добавьте комментарий к задаче из плана';
const MAX_TASK_NOTE_LENGTH = 5_000;

type PersonInfo = {
  name?: string;
  email?: string;
};

function extractPersonDetails(input: unknown): PersonInfo | null {
  if (!input) return null;
  if (typeof input === 'string') {
    const cleaned = input.trim();
    return cleaned ? { name: cleaned } : null;
  }
  if (typeof input === 'object') {
    const data = input as Record<string, unknown>;
    const first = data.first_name ?? data.firstName ?? data.creator_first_name ?? data.creatorFirstName;
    const last = data.last_name ?? data.lastName ?? data.creator_last_name ?? data.creatorLastName;
    const full = data.name ?? data.full_name ?? data.fullName ?? data.display_name ?? data.username;
    const email = data.email ?? data.mail ?? data.creator_email ?? data.creatorEmail ?? data.email_address;
    const buildName = (value: unknown) => (typeof value === 'string' && value.trim().length > 0 ? value.trim() : '');
    const nameCandidate = buildName(full) || [first, last].map(buildName).filter(Boolean).join(' ').trim();
    return {
      name: nameCandidate || undefined,
      email: typeof email === 'string' && email.trim().length > 0 ? email.trim() : undefined,
    };
  }
  return null;
}

function resolveCreatorInfo(taskData: Record<string, unknown>): PersonInfo | undefined {
  const creatorCandidates = [
    taskData.creator,
    taskData.created_by,
    taskData.createdBy,
    taskData.author,
    taskData.owner,
    {
      first_name: taskData.creator_first_name ?? taskData.author_first_name,
      last_name: taskData.creator_last_name ?? taskData.author_last_name,
      email: taskData.creator_email ?? taskData.author_email,
      name: taskData.creator_name ?? taskData.author_name,
    },
  ];

  let result: PersonInfo | undefined;
  for (const candidate of creatorCandidates) {
    const person = extractPersonDetails(candidate);
    if (!person) continue;
    result = {
      name: person.name ?? result?.name,
      email: person.email ?? result?.email,
    };
    if (result.name && result.email) {
      break;
    }
  }
  return result;
}

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

  let mappedTask: UITask | null = null;
  let fallbackDescription: string | undefined;
  let priorityValue: number | undefined;
  let assignees: TaskAssignee[] | undefined;
  let statusName: string | undefined;
  let statusColor: string | undefined;
  let creatorName: string | undefined;
  let creatorEmail: string | undefined;

  try {
    const task = await fetchTaskById(trimmedId);
    if (task && typeof task === 'object') {
      const taskData = task as Record<string, unknown>;
      const titleCandidate = taskData.name ?? taskData.title;
      if (typeof titleCandidate === 'string' && titleCandidate.trim().length > 0) {
        taskTitle = titleCandidate.trim();
      }

      try {
        mappedTask = mapTask(task as TaskShort);
      } catch {
        mappedTask = null;
      }

      if (mappedTask) {
        fallbackDescription = mappedTask.description;
        priorityValue = mappedTask.priority ?? undefined;
        assignees = mappedTask.assignees;
        const primaryStatus = Array.isArray(mappedTask.statuses)
          ? mappedTask.statuses.find((status) => status?.boardId === boardHint) ?? mappedTask.statuses[0]
          : undefined;
        statusName = primaryStatus?.name ?? primaryStatus?.key;
        statusColor = primaryStatus?.color;

        if (!boardIdForLookup && primaryStatus?.boardId) {
          boardIdForLookup = primaryStatus.boardId;
        }
        if (!projectId && primaryStatus?.projectId) {
          projectId = primaryStatus.projectId;
        }
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

      if (!statusName) {
        const statusNameCandidate = status && typeof status === 'object'
          ? (status as Record<string, unknown>).name ?? (status as Record<string, unknown>).title
          : typeof status === 'string'
            ? status
            : undefined;
        if (typeof statusNameCandidate === 'string' && statusNameCandidate.trim().length > 0) {
          statusName = statusNameCandidate.trim();
        }
      }

      if (!statusColor) {
        const statusColorCandidate = status && typeof status === 'object'
          ? (status as Record<string, unknown>).color
          : undefined;
        if (typeof statusColorCandidate === 'string' && statusColorCandidate.trim().length > 0) {
          statusColor = statusColorCandidate.trim();
        }
      }

      const descriptionCandidates = [
        taskData.description,
        taskData.desc,
        taskData.details,
        taskData.body,
        taskData.content,
        taskData.summary,
      ];
      const description = descriptionCandidates.find((value) => typeof value === 'string' && value.trim().length > 0);
      if (typeof description === 'string') {
        fallbackDescription = description.trim();
      }

      if (taskData.priority && typeof taskData.priority === 'number') {
        priorityValue = taskData.priority;
      }

      const creatorInfo = resolveCreatorInfo(taskData);
      if (creatorInfo) {
        creatorName = creatorInfo.name ?? creatorName;
        creatorEmail = creatorInfo.email ?? creatorEmail;
      }
    }
  } catch (error) {
    console.warn('Не удалось получить данные задачи через fetchTaskById', trimmedId, error);
  }

  // Если не удалось получить board/project из fetchTaskById, попробуем через fetchTaskBoardProject
  if ((!boardIdForLookup || !projectId) && !boardName) {
    try {
      const boardProjectInfo = await fetchTaskBoardProject(trimmedId);
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
    taskId: trimmedId,
    boardId: boardIdForLookup,
    projectId,
    taskTitle,
    boardName: boardName ?? (boardIdForLookup ? `Доска ${boardIdForLookup}` : 'Неизвестная доска'),
    projectName: projectName ?? (projectId ? `Проект ${projectId}` : 'Неизвестный проект'),
    due: mappedTask?.due ?? undefined,
    statusName,
    statusColor,
    priority: priorityValue,
    assignees,
    description: fallbackDescription,
    creatorName,
    creatorEmail,
  };

  taskInfoCache.set(trimmedId, result);
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
  const userId = getUserId();
  const { data: userRole } = useUserRole(userId, hasCreds);
  const normalizedRole = userRole?.role?.name?.trim().toLowerCase();
  const isGuest = normalizedRole === 'guest';
  const canWrite = !isGuest;

  useEffect(() => {
    if (isGuest && showWizard) setShowWizard(false);
  }, [isGuest, showWizard]);

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

  const containerClasses = ['w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8', isGuest ? '' : 'mx-auto max-w-6xl']
    .filter(Boolean)
    .join(' ');
  const headerPanelClasses = ['flex flex-col gap-4 p-6', isGuest ? '' : 'md:flex-row md:items-center md:justify-between']
    .filter(Boolean)
    .join(' ');

  return (
    <main className="overflow-y-auto h-full text-white">
      {showWizard ? (
        <ReportWizardView
          onClose={handleWizardClose}
          onCreated={() => {
            handleReportCreated();
            handleWizardClose();
          }}
        />
      ) : (
        <div className={containerClasses}>
          <Panel className={headerPanelClasses}>
            <div>
              <h1 className="text-2xl font-semibold">Отчёты команды</h1>
              <p className="text-sm text-slate-300">Просматривайте ежедневные отчёты сотрудников и переходите к деталям одним кликом.</p>
            </div>
            {!isGuest && (
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="self-start rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black transition hover:brightness-110"
              >
                Создать отчёт
              </button>
            )}
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

  const [doneTaskKeys, setDoneTaskKeys] = useState<string[]>([]);
  const [planTaskKeys, setPlanTaskKeys] = useState<string[]>([]);
  const [doneNotes, setDoneNotes] = useState<Record<string, string>>({});
  const [planNotes, setPlanNotes] = useState<Record<string, string>>({});
  const [expandedDone, setExpandedDone] = useState<Set<string>>(new Set());
  const [expandedPlan, setExpandedPlan] = useState<Set<string>>(new Set());
  const [taskMap, setTaskMap] = useState<Map<string, TaskInfo>>(new Map());
  const [detailedInfo, setDetailedInfo] = useState<Map<string, TaskInfo>>(new Map());
  const detailedInfoPendingRef = useRef<Set<string>>(new Set());
  const [modalMode, setModalMode] = useState<'done' | 'plan' | null>(null);
  const [improvingKey, setImprovingKey] = useState<string | null>(null);
  const [typingState, setTypingState] = useState<{ key: string; target: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
  const [needHelp, setNeedHelp] = useState<'yes' | 'no' | null>('no');
  const [helpComments, setHelpComments] = useState<Record<string, string>>({});
  const [selectedHelpers, setSelectedHelpers] = useState<Employee[]>([]);
  const [reportDate, setReportDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [commentReminderVisible, setCommentReminderVisible] = useState(false);

  const improveReportMutation = useImproveTaskReport();
  const createReportMutation = useCreateReport();
  const toast = useToast();

  const trackedTaskIds = useMemo(() => {
    const ids = new Set<string>();
    [...doneTaskKeys, ...planTaskKeys].forEach((key) => {
      const { taskId } = parseTaskKeyValue(key);
      if (taskId) {
        ids.add(taskId);
      }
    });
    return Array.from(ids);
  }, [doneTaskKeys, planTaskKeys]);

  const taskQueries = useTasksByIds(trackedTaskIds, hasCreds && trackedTaskIds.length > 0);

  const queriesByTaskId = useMemo(() => {
    const map = new Map<string, { ui?: UITask; raw?: any; isLoading: boolean; isError: boolean }>();
    trackedTaskIds.forEach((taskId, index) => {
      const query = taskQueries[index];
      const raw = query?.data;
      let ui: UITask | undefined;
      if (raw) {
        try {
          ui = mapTask(raw as TaskShort);
        } catch {
          ui = undefined;
        }
      }
      map.set(taskId, {
        ui,
        raw,
        isLoading: Boolean(query?.isLoading),
        isError: Boolean(query?.isError),
      });
    });
    return map;
  }, [taskQueries, trackedTaskIds]);

  const updateTaskMap = useCallback((newTaskMap: Map<string, TaskInfo>) => {
    setTaskMap((prev) => {
      const merged = new Map(prev);
      newTaskMap.forEach((value, key) => {
        const existing = merged.get(key);
        merged.set(key, existing ? { ...existing, ...value } : value);
      });
      return merged;
    });
  }, []);

  const toggleProblem = useCallback((problemId: string) => {
    setSelectedProblems((prev) => {
      const next = new Set(prev);
      if (next.has(problemId)) {
        next.delete(problemId);
      } else {
        next.add(problemId);
      }
      return next;
    });
  }, []);

  const selectHelpers = useCallback((helpers: Employee[]) => {
    setSelectedHelpers(helpers);
  }, []);

  const ensureDetailedInfo = useCallback((taskId: string | null | undefined) => {
    if (!taskId) return;
    if (detailedInfoPendingRef.current.has(taskId)) return;

    let shouldFetch = false;
    setDetailedInfo((prev) => {
      if (prev.has(taskId)) {
        return prev;
      }
      shouldFetch = true;
      return prev;
    });
    if (!shouldFetch) return;

    detailedInfoPendingRef.current.add(taskId);
    void (async () => {
      try {
        const info = await loadTaskInfo(taskId);
        setDetailedInfo((prev) => {
          if (prev.has(taskId)) return prev;
          const next = new Map(prev);
          next.set(taskId, info);
          return next;
        });
      } catch (error) {
        console.warn('Не удалось получить подробности задачи', taskId, error);
      } finally {
        detailedInfoPendingRef.current.delete(taskId);
      }
    })();
  }, []);

  useEffect(() => {
    doneTaskKeys.forEach((key) => {
      if (expandedDone.has(key)) {
        const { taskId } = parseTaskKeyValue(key);
        ensureDetailedInfo(taskId);
      }
    });
  }, [ensureDetailedInfo, expandedDone, doneTaskKeys]);

  useEffect(() => {
    planTaskKeys.forEach((key) => {
      if (expandedPlan.has(key)) {
        const { taskId } = parseTaskKeyValue(key);
        ensureDetailedInfo(taskId);
      }
    });
  }, [ensureDetailedInfo, expandedPlan, planTaskKeys]);

  useEffect(() => {
    if (!typingState) return;
    const { key, target } = typingState;
    if (!target || target.length === 0) {
      setDoneNotes((prev) => ({ ...prev, [key]: '' }));
      setTypingState(null);
      setImprovingKey((prev) => (prev === key ? null : prev));
      return;
    }
    let index = 0;
    const interval = setInterval(() => {
      index += 1;
      const nextText = target.slice(0, index);
      setDoneNotes((prev) => ({ ...prev, [key]: nextText }));
      if (index >= target.length) {
        clearInterval(interval);
        setTypingState(null);
        setImprovingKey((prev) => (prev === key ? null : prev));
      }
    }, 16);
    return () => clearInterval(interval);
  }, [typingState]);

  useEffect(() => {
    if (commentReminderVisible && Object.keys(validationErrors).length === 0) {
      setCommentReminderVisible(false);
    }
  }, [commentReminderVisible, validationErrors]);

  const handleToggleCard = useCallback((mode: 'done' | 'plan', key: string) => {
    if (mode === 'done') {
      setExpandedDone((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
          const { taskId } = parseTaskKeyValue(key);
          ensureDetailedInfo(taskId);
        }
        return next;
      });
    } else {
      setExpandedPlan((prev) => {
        const next = new Set(prev);
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
          const { taskId } = parseTaskKeyValue(key);
          ensureDetailedInfo(taskId);
        }
        return next;
      });
    }
  }, [ensureDetailedInfo]);

  const handleRemoveTask = useCallback((mode: 'done' | 'plan', key: string) => {
    if (mode === 'done') {
      setDoneTaskKeys((prev) => prev.filter((item) => item !== key));
      setDoneNotes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setExpandedDone((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setValidationErrors((prev) => {
        if (!(key in prev)) return prev;
        if (prev[key] !== DONE_TASK_NOTE_ERROR) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    } else {
      setPlanTaskKeys((prev) => prev.filter((item) => item !== key));
      setPlanNotes((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setExpandedPlan((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      setValidationErrors((prev) => {
        if (prev[key] !== PLAN_TASK_NOTE_ERROR) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, []);

  const handleNoteChange = useCallback((mode: 'done' | 'plan', key: string, value: string) => {
    if (mode === 'done') {
      setDoneNotes((prev) => ({ ...prev, [key]: value }));
      setValidationErrors((prev) => {
        if (!(key in prev)) return prev;
        if (prev[key] !== DONE_TASK_NOTE_ERROR) return prev;
        if (value.trim().length > 0) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    } else {
      setPlanNotes((prev) => ({ ...prev, [key]: value }));
      setValidationErrors((prev) => {
        if (!(key in prev)) return prev;
        if (prev[key] !== PLAN_TASK_NOTE_ERROR) return prev;
        if (value.trim().length > 0) {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    }
  }, []);

  const handleCompleteCard = useCallback((mode: 'done' | 'plan', key: string) => {
    if (mode === 'done') {
      const note = (doneNotes[key] ?? '').trim();
      if (!note) {
        setValidationErrors((prev) => ({
          ...prev,
          [key]: DONE_TASK_NOTE_ERROR,
        }));
        setExpandedDone((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return;
      }
      setValidationErrors((prev) => {
        if (!(key in prev)) return prev;
        if (prev[key] !== DONE_TASK_NOTE_ERROR) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setExpandedDone((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      const note = (planNotes[key] ?? '').trim();
      if (!note) {
        setValidationErrors((prev) => ({
          ...prev,
          [key]: PLAN_TASK_NOTE_ERROR,
        }));
        setExpandedPlan((prev) => {
          const next = new Set(prev);
          next.add(key);
          return next;
        });
        return;
      }
      setValidationErrors((prev) => {
        if (!(key in prev)) return prev;
        if (prev[key] !== PLAN_TASK_NOTE_ERROR) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setExpandedPlan((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [doneNotes, planNotes]);

  const handleModalSubmit = useCallback((mode: 'done' | 'plan', keys: string[]) => {
    const uniqueKeys = Array.from(new Set(keys));
    if (mode === 'done') {
      const previousKeys = doneTaskKeys;
      setDoneTaskKeys(uniqueKeys);
      setDoneNotes((prev) => {
        const next: Record<string, string> = {};
        uniqueKeys.forEach((taskKey) => {
          next[taskKey] = prev[taskKey] ?? '';
        });
        return next;
      });
      setExpandedDone((prev) => {
        const next = new Set<string>();
        uniqueKeys.forEach((taskKey) => {
          if (prev.has(taskKey) || !previousKeys.includes(taskKey)) {
            next.add(taskKey);
          }
        });
        uniqueKeys.forEach((taskKey) => {
          if (!previousKeys.includes(taskKey)) {
            next.add(taskKey);
          }
        });
        return next;
      });
      setValidationErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((taskKey) => {
          if (next[taskKey] === DONE_TASK_NOTE_ERROR && !uniqueKeys.includes(taskKey)) {
            delete next[taskKey];
          }
        });
        return next;
      });
    } else {
      const previousKeys = planTaskKeys;
      setPlanTaskKeys(uniqueKeys);
      setPlanNotes((prev) => {
        const next: Record<string, string> = {};
        uniqueKeys.forEach((taskKey) => {
          next[taskKey] = prev[taskKey] ?? '';
        });
        return next;
      });
      setExpandedPlan((prev) => {
        const next = new Set<string>();
        uniqueKeys.forEach((taskKey) => {
          if (prev.has(taskKey) || !previousKeys.includes(taskKey)) {
            next.add(taskKey);
          }
        });
        uniqueKeys.forEach((taskKey) => {
          if (!previousKeys.includes(taskKey)) {
            next.add(taskKey);
          }
        });
        return next;
      });
      setValidationErrors((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((taskKey) => {
          if (next[taskKey] === PLAN_TASK_NOTE_ERROR && !uniqueKeys.includes(taskKey)) {
            delete next[taskKey];
          }
        });
        return next;
      });
    }
    setModalMode(null);
  }, [doneTaskKeys, planTaskKeys]);

  const handleImprove = useCallback(async (key: string, currentText: string) => {
    const { taskId } = parseTaskKeyValue(key);
    if (!taskId) {
      console.warn('Report wizard: отсутствует taskId для генерации', key);
      return;
    }
    setImprovingKey(key);
    setTypingState(null);
    try {
      const result = await improveReportMutation.mutateAsync({ taskId, userText: currentText });
      const improvedText = typeof result?.improved_text === 'string' && result.improved_text.trim().length > 0
        ? result.improved_text.trim()
        : currentText;
      setDoneNotes((prev) => ({
        ...prev,
        [key]: '',
      }));
      setTypingState({ key, target: improvedText });
    } catch (error) {
      console.error('Ошибка при генерации комментария отчёта', error);
      toast.error('Не удалось сгенерировать комментарий. Попробуйте позже.');
      setImprovingKey((prev) => (prev === key ? null : prev));
    }
  }, [improveReportMutation]);

  const getTaskDetails = useCallback((key: string): CombinedTaskDetails => {
    const { taskId } = parseTaskKeyValue(key);
    const base = taskMap.get(key);
    const extra = taskId ? detailedInfo.get(taskId) : undefined;
    const queryInfo = taskId ? queriesByTaskId.get(taskId) : undefined;
    const ui = queryInfo?.ui;

    const projectName = extra?.projectName ?? base?.projectName ?? 'Проект не указан';
    const boardName = extra?.boardName ?? base?.boardName ?? 'Доска не указана';
    const statusName = extra?.statusName
      ?? base?.statusName
      ?? (Array.isArray(ui?.statuses) && ui.statuses.length > 0
        ? ui.statuses[0]?.name ?? ui.statuses[0]?.key
        : undefined);
    const statusColor = extra?.statusColor
      ?? base?.statusColor
      ?? (Array.isArray(ui?.statuses) && ui.statuses.length > 0 ? ui.statuses[0]?.color : undefined);
    const priority = extra?.priority ?? base?.priority ?? ui?.priority ?? undefined;
    const assignees = extra?.assignees ?? base?.assignees ?? ui?.assignees;
    const description = extra?.description ?? base?.description ?? ui?.description;
    let creatorName = extra?.creatorName ?? base?.creatorName;
    let creatorEmail = extra?.creatorEmail ?? base?.creatorEmail;
    const title = base?.taskTitle ?? extra?.taskTitle ?? ui?.title ?? (taskId ? `Задача ${taskId}` : 'Задача');

    if ((!creatorName || !creatorEmail) && queryInfo?.raw && typeof queryInfo.raw === 'object' && queryInfo.raw !== null) {
      const creatorInfo = resolveCreatorInfo(queryInfo.raw as Record<string, unknown>);
      if (creatorInfo) {
        creatorName = creatorName ?? creatorInfo.name;
        creatorEmail = creatorEmail ?? creatorInfo.email;
      }
    }

    return {
      taskId: taskId ?? undefined,
      title,
      projectName,
      boardName,
      statusName,
      statusColor,
      priority,
      assignees,
      description,
      creatorName,
      creatorEmail,
      loading: Boolean(queryInfo?.isLoading && !ui && !extra),
      error: Boolean(queryInfo?.isError),
    };
  }, [taskMap, detailedInfo, queriesByTaskId]);

  const handleSubmit = async () => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Ошибка: пользователь не авторизован');
      return;
    }

    if (doneTaskKeys.length === 0 || planTaskKeys.length === 0) {
      setSubmitError('Добавьте хотя бы одну задачу в разделы «Сделано сегодня» и «План на завтра».');
      setCommentReminderVisible(false);
      return;
    }

    const missingDone = doneTaskKeys.filter((key) => !(doneNotes[key]?.trim()));
    const missingPlan = planTaskKeys.filter((key) => !(planNotes[key]?.trim()));
    if (missingDone.length > 0 || missingPlan.length > 0) {
      setCommentReminderVisible(true);
      setValidationErrors((prev) => {
        const next = { ...prev };
        missingDone.forEach((taskKey) => {
          next[taskKey] = DONE_TASK_NOTE_ERROR;
        });
        missingPlan.forEach((taskKey) => {
          next[taskKey] = PLAN_TASK_NOTE_ERROR;
        });
        return next;
      });
      if (missingDone.length > 0) {
        setExpandedDone((prev) => {
          const next = new Set(prev);
          missingDone.forEach((taskKey) => next.add(taskKey));
          return next;
        });
      }
      if (missingPlan.length > 0) {
        setExpandedPlan((prev) => {
          const next = new Set(prev);
          missingPlan.forEach((taskKey) => next.add(taskKey));
          return next;
        });
      }
      const firstKey = missingDone[0] ?? missingPlan[0];
      const element = typeof document !== 'undefined' ? document.querySelector(`[data-task-key="${firstKey}"]`) : null;
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const submitErrorMessage = missingDone.length > 0 && missingPlan.length > 0
        ? 'Заполните комментарии для всех задач в разделах «Сделано сегодня» и «План на завтра».'
        : missingDone.length > 0
          ? 'Заполните комментарии для всех задач в разделе «Сделано сегодня».'
          : 'Заполните комментарии для всех задач в разделе «План на завтра».';
      setSubmitError(submitErrorMessage);
      return;
    }

    setCommentReminderVisible(false);
    setSubmitError(null);

    const completeWork = doneTaskKeys.map((key) => ({
      task_id: resolveTaskIdFromKey(key) ?? '',
      description: (doneNotes[key] ?? '').trim(),
    }));

    const planTomorrow = planTaskKeys
      .map((key) => {
        const note = (planNotes[key] ?? '').trim();
        if (!note) {
          return null;
        }
        const taskId = resolveTaskIdFromKey(key);
        return {
          description: note,
          ...(taskId ? { task_id: taskId } : {}),
        };
      })
      .filter((item): item is { description: string; task_id?: string } => item !== null);

    const helpRequests = selectedHelpers.map((helper) => ({
      helper_id: helper.id,
      description: helpComments[helper.id] || '',
      status: 'pending',
    }));

    const [year, month, day] = reportDate.split('-').map(Number);
    const reportDateISO = new Date(Date.UTC(year, month - 1, day)).toISOString();

    const payload = {
      complete_work: completeWork,
      plan_tomorrow: planTomorrow,
      help: helpRequests,
      problems: Array.from(selectedProblems),
      report_date: reportDateISO,
      user_id: userId,
    };

    try {
      await createReportMutation.mutateAsync(payload);
      setShowSuccessModal(true);
    } catch (error) {
      console.error('Ошибка при создании отчета:', error);
      toast.error('Ошибка при создании отчета. Попробуйте еще раз.');
    }
  };

  const handleSuccessClose = useCallback(() => {
    setShowSuccessModal(false);
    onCreated();
    onClose();
  }, [onClose, onCreated]);

  const renderTaskCard = (mode: 'done' | 'plan', key: string) => {
    const details = getTaskDetails(key);
    const expanded = mode === 'done' ? expandedDone.has(key) : expandedPlan.has(key);
    const note = mode === 'done' ? doneNotes[key] ?? '' : planNotes[key] ?? '';
    const error = validationErrors[key];
    const priorityMeta = getTaskPriorityMeta(details.priority ?? undefined);
    const primaryAssignee = details.assignees?.[0];
    const assigneeLabel = primaryAssignee?.name ?? primaryAssignee?.email ?? 'Не назначен';
    const assigneeEmail = primaryAssignee?.email;
    const aiWriting = typingState?.key === key;
    const generating = improvingKey === key;
    const cardClass = [
      'rounded-2xl bg-white/5 transition-shadow ring-1',
      error ? 'border border-rose-500/60 ring-rose-500/40 hover:ring-rose-400/40' : 'border border-white/10 ring-transparent hover:ring-emerald-500/30',
    ].join(' ');

    return (
      <div key={key} data-task-key={key} className={cardClass}>
        <button
          type="button"
          onClick={() => handleToggleCard(mode, key)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          aria-expanded={expanded}
        >
          <span className="font-semibold text-base text-white truncate">{details.title}</span>
          <svg
            className={`h-5 w-5 text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {expanded && (
          <div className="border-t border-white/10 px-4 py-4 space-y-4">
            {details.loading && (
              <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs text-slate-300">
                Загрузка информации о задаче…
              </div>
            )}

            <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-500">Проект</span>
                <span className="mt-1 text-slate-200">{details.projectName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-500">Доска</span>
                <span className="mt-1 text-slate-200">{details.boardName}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-500">Статус</span>
                <span className="mt-1 inline-flex items-center gap-2 text-slate-200">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: details.statusColor ?? '#34d399' }}
                  />
                  {details.statusName ?? 'Не указан'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-500">Срочность</span>
                <span className={`mt-1 inline-flex w-max items-center rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${priorityMeta.badgeClass}`}>
                  {priorityMeta.label}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-500">Исполнитель</span>
                <span className="mt-1 text-slate-200">
                  {assigneeLabel}
                  {assigneeEmail ? <span className="ml-2 text-xs text-slate-400">{assigneeEmail}</span> : null}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wide text-slate-500">Создатель</span>
                <span className="mt-1 text-slate-200">
                  {details.creatorName ?? 'Не указан'}
                  {details.creatorEmail ? <span className="ml-2 text-xs text-slate-400">{details.creatorEmail}</span> : null}
                </span>
              </div>
            </div>

            <div className="text-sm text-slate-300">
              <span className="block text-xs uppercase tracking-wide text-slate-500 mb-1">Описание задачи</span>
              <p className="whitespace-pre-wrap text-slate-200">
                {details.description?.trim() ? details.description : 'Описание отсутствует'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs uppercase tracking-wide text-slate-500">
                {mode === 'done' ? 'Комментарий к выполненной работе*' : 'Комментарий к плану'}
              </label>
              <textarea
                value={note}
                onChange={(event) => handleNoteChange(mode, key, event.target.value)}
                placeholder={mode === 'done' ? 'Опишите, что было сделано сегодня…' : 'Что планируете сделать в следующий рабочий день…'}
                className="w-full min-h-[96px] rounded-xl bg-black/20 px-4 py-3 text-sm text-slate-100 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y"
              />
              {error ? (
                <div className="text-xs text-rose-300">{error}</div>
              ) : null}
              <div className="flex justify-end">
                <span
                  className={`text-xs ${note.length >= MAX_TASK_NOTE_LENGTH ? 'text-rose-300' : 'text-slate-400'}`}
                >
                  {note.length}/{MAX_TASK_NOTE_LENGTH}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                {mode === 'done' ? (
                  <button
                    type="button"
                    onClick={() => handleImprove(key, note)}
                    disabled={generating}
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 px-4 py-2 text-sm text-emerald-200 transition hover:border-emerald-400 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {generating ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-300 border-t-transparent" />
                        ИИ пишет комментарий…
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-4-9m-5 7a7 7 0 110-14 7 7 0 010 14z" />
                        </svg>
                        Сгенерировать комментарий
                      </>
                    )}
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRemoveTask(mode, key)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-rose-400/40 hover:text-rose-200"
                  >
                    Удалить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCompleteCard(mode, key)}
                    className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-500 disabled:opacity-60"
                    disabled={generating || aiWriting}
                  >
                    Готово
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!hasCreds) {
    return (
      <div className="mx-auto max-w-4xl p-6 text-slate-300">
        Для создания отчёта необходимо авторизоваться.
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full text-white">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            Назад к списку отчётов
          </button>
          <button
            type="button"
          onClick={handleSubmit}
          disabled={createReportMutation.isPending || doneTaskKeys.length === 0 || planTaskKeys.length === 0}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60"
          >
            {createReportMutation.isPending ? 'Сохраняем…' : 'Создать отчёт'}
          </button>
        </div>

        {submitError && (
          <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {submitError}
          </div>
        )}

        <Panel className="p-6 space-y-5 t-surface">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Сделано сегодня</h2>
              <p className="text-sm text-slate-300">Выберите задачи и опишите, что было выполнено.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalMode('done')}
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
            >
              + Добавить задачи
            </button>
          </div>

          {doneTaskKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
              Пока ничего не добавлено. Нажмите «Добавить задачи», чтобы начать.
            </div>
          ) : (
            <div className="space-y-4">
              {doneTaskKeys.map((key) => renderTaskCard('done', key))}
            </div>
          )}
        </Panel>

        <Panel className="p-6 space-y-5 t-surface">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">План на завтра</h2>
              <p className="text-sm text-slate-300">Укажите задачи, на которых сосредоточитесь в следующий рабочий день.</p>
            </div>
            <button
              type="button"
              onClick={() => setModalMode('plan')}
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-sm font-semibold text-black hover:brightness-110"
            >
              + Добавить задачи
            </button>
          </div>

          {planTaskKeys.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
              Запланируйте задачи, чтобы держать команду в курсе ваших планов.
            </div>
          ) : (
            <div className="space-y-4">
              {planTaskKeys.map((key) => renderTaskCard('plan', key))}
            </div>
          )}
        </Panel>

        <Panel className="p-6 t-surface">
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
        </Panel>

        <div className="flex flex-wrap items-center justify-end gap-4">
          {commentReminderVisible ? (
            <span className="text-sm font-medium text-rose-300">Сначала заполните все комментарии</span>
          ) : null}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createReportMutation.isPending || doneTaskKeys.length === 0 || planTaskKeys.length === 0}
            className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-6 py-3 text-sm font-semibold text-black hover:brightness-110 disabled:opacity-60"
          >
            {createReportMutation.isPending ? 'Сохраняем…' : 'Сохранить отчёт'}
          </button>
        </div>
      </div>

      <TaskPickerModal
        mode="done"
        open={modalMode === 'done'}
        initialSelected={doneTaskKeys}
        onClose={() => setModalMode(null)}
        onSubmit={(keys) => handleModalSubmit('done', keys)}
        onTaskInfoUpdate={updateTaskMap}
      />
      <TaskPickerModal
        mode="plan"
        open={modalMode === 'plan'}
        initialSelected={planTaskKeys}
        onClose={() => setModalMode(null)}
        onSubmit={(keys) => handleModalSubmit('plan', keys)}
        onTaskInfoUpdate={updateTaskMap}
      />

      <SuccessModal open={showSuccessModal} onClose={handleSuccessClose} />
    </div>
  );
}

type TaskPickerModalProps = {
  mode: 'done' | 'plan';
  open: boolean;
  initialSelected: string[];
  onClose: () => void;
  onSubmit: (keys: string[]) => void;
  onTaskInfoUpdate: (map: Map<string, TaskInfo>) => void;
};

function TaskPickerModal({ mode, open, initialSelected, onClose, onSubmit, onTaskInfoUpdate }: TaskPickerModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected));

  useEffect(() => {
    setSelected(new Set(initialSelected));
  }, [initialSelected, open]);

  const handleToggle = (boardId: string, taskId: string) => {
    setSelected((prev) => {
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

  const handleSubmit = () => {
    onSubmit(Array.from(selected));
  };

  return (
    <Modal open={open} onClose={onClose}>
      <div className="max-h-[80vh] overflow-hidden rounded-2xl border border-white/15 bg-[#03150f] p-6 text-white shadow-2xl">
        <div className="max-h-[64vh] overflow-y-auto pr-2 custom-scroll">
          <ReportProjectPicker
            selected={selected}
            onToggle={handleToggle}
            onTaskInfoUpdate={onTaskInfoUpdate}
            title={mode === 'done' ? 'Сделано сегодня' : 'План на завтра'}
            description={mode === 'done'
              ? 'Выберите задачи, по которым сегодня была выполнена работа.'
              : 'Выберите задачи, которые хотите запланировать на следующий рабочий день.'}
          />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200 hover:bg-white/10"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 text-sm font-semibold text-black hover:brightness-110"
          >
            Добавить
          </button>
        </div>
      </div>
    </Modal>
  );
}

function parseTaskKeyValue(key: string): { boardId: string | null; taskId: string | null } {
  if (!key) return { boardId: null, taskId: null };
  const parts = key.split(':');
  if (parts.length === 1) {
    const taskId = parts[0]?.trim() ?? '';
    return {
      boardId: null,
      taskId: taskId.length > 0 ? taskId : null,
    };
  }
  const [boardPart, taskPart] = parts;
  const boardId = boardPart?.trim() ?? '';
  const taskId = taskPart?.trim() ?? '';
  return {
    boardId: boardId.length > 0 ? boardId : null,
    taskId: taskId.length > 0 ? taskId : null,
  };
}

function resolveTaskIdFromKey(key: string): string | undefined {
  const { taskId } = parseTaskKeyValue(key);
  return taskId ?? undefined;
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
              <div className="text-sm text-slate-300">
                {report.reportDate ? formatReportDate(report.reportDate) : formatDateTime(report.createdAt)}
              </div>
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

function extractDatePart(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }
  const prefixMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (prefixMatch) {
    return `${prefixMatch[1]}-${prefixMatch[2]}-${prefixMatch[3]}`;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateKey(key?: string): Date | null {
  if (!key) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(year, month - 1, day);
}

function normalizeDateKey(raw?: string) {
  if (!raw) return 'unknown';
  const datePart = extractDatePart(raw);
  return datePart ?? raw;
}

function compareDateKeys(a: string, b: string) {
  if (a === b) return 0;
  if (a === 'unknown') return 1;
  if (b === 'unknown') return -1;
  const dateA = parseDateKey(a);
  const dateB = parseDateKey(b);
  if (!dateA || !dateB) {
    return b.localeCompare(a);
  }
  return dateA.getTime() - dateB.getTime();
}

function formatDateLabel(key: string) {
  if (!key || key === 'unknown') {
    return 'Без даты';
  }
  const parsed = parseDateKey(key);
  if (parsed) {
    return withWeekdayLabel(parsed);
  }

  const fallback = new Date(key);
  if (!Number.isNaN(fallback.getTime())) {
    return withWeekdayLabel(fallback);
  }
  return key;
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

function formatReportDate(value?: string) {
  const datePart = extractDatePart(value);
  if (!datePart) {
    return value ?? 'Дата не указана';
  }
  const parsed = parseDateKey(datePart);
  if (parsed) {
    return withWeekdayLabel(parsed);
  }
  return datePart;
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
