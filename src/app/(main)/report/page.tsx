'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import ReportProjectPicker from '@/components/ReportProjectPicker';
import SlideTrack from '@/components/ReportWizard/SlideTrack';
import WizardNav from '@/components/ReportWizard/WizardNav';
import NotesForm from '@/components/ReportWizard/NotesForm';
import FinalQuestions from '@/components/ReportWizard/FinalQuestions';
import SuccessModal from '@/components/ReportWizard/SuccessModal';
import { useCreateReport } from '@/features/reports/hooks';
import { Employee } from '@/lib/types';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { TaskInfo } from '@/components/ReportProjectPicker';
import { useImproveTaskReport } from '@/features/tasks/hooks';
import { fetchTaskById } from '@/features/tasks/api';
import { fetchBoardById } from '@/features/boards/api';
import { fetchProjectById } from '@/features/projects/api';

type Notes = Record<string, string>; // key `${boardId}:${taskId}` -> text


const employees = [
    { id: 'u1', name: 'Мария Иванова', email: 'm.ivanova@emplacc.io', role: 'Frontend' },
    { id: 'u2', name: 'Андрей Петров', email: 'a.petrov@emplacc.io', role: 'Backend' },
    { id: 'u3', name: 'Светлана Ким', email: 's.kim@emplacc.io', role: 'QA' },
    { id: 'u4', name: 'Илья Смирнов', email: 'i.smirnov@emplacc.io', role: 'DevOps' },
    { id: 'u5', name: 'Илья Смирнов', email: 'i.smirnov@emplacc.io', role: 'DevOps' },
    { id: 'u6', name: 'Илья Смирнов', email: 'i.smirnov@emplacc.io', role: 'DevOps' },
    { id: 'u7', name: 'Илья Смирнов', email: 'i.smirnov@emplacc.io', role: 'DevOps' },
];


export default function ReportsPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();

  // выборы
  const [selectedDone, setSelectedDone] = useState<Set<string>>(new Set());
  const [selectedPlan, setSelectedPlan] = useState<Set<string>>(new Set());

  // заметки
  const [doneNotes, setDoneNotes] = useState<Notes>({});
  const [planNotes, setPlanNotes] = useState<Notes>({});

    // финальные поля
    const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
    const [needHelp, setNeedHelp] = useState<'yes' | 'no' | null>(null);
    const [helpComments, setHelpComments] = useState<Record<string, string>>({});
    const [selectedHelpers, setSelectedHelpers] = useState<Employee[]>([]);
    const [reportDate, setReportDate] = useState<string>(() => {
        // Устанавливаем текущую дату по умолчанию
        const today = new Date();
        return today.toISOString().split('T')[0]; // Формат YYYY-MM-DD
    });

  // текущий индекс слайда
  const [step, setStep] = useState(0);
  
  // состояние модалки успеха
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Карта задач для получения названий
  const [taskMap, setTaskMap] = useState<Map<string, TaskInfo>>(new Map());
  const improveReportMutation = useImproveTaskReport();
  const createReportMutation = useCreateReport();
  const [improvingKey, setImprovingKey] = useState<string | null>(null);
  const [pickerResetToken, setPickerResetToken] = useState(0);
  
  // Функция для обновления карты задач
  const updateTaskMap = useCallback((newTaskMap: Map<string, TaskInfo>) => {
    setTaskMap(prev => {
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

    let taskTitle = `Задача ${taskId}`;
    let boardIdForLookup = boardPart?.trim();
    let boardName: string | undefined;
    let projectId: string | undefined;
    let projectName: string | undefined;

    try {
      const task = await fetchTaskById(taskId);
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
      console.warn('Не удалось получить данные задачи через fetchTaskById', taskId, error);
    }

    if ((!boardName || !projectId) && boardIdForLookup) {
      try {
        const board = await fetchBoardById(boardIdForLookup);
        if (board) {
          if (!boardName && typeof board.name === 'string' && board.name.trim().length > 0) {
            boardName = board.name.trim();
          }
          const boardProjectId = board.projectId;
          if (!projectId && typeof boardProjectId === 'string' && boardProjectId.trim().length > 0) {
            projectId = boardProjectId.trim();
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

    return {
      taskTitle,
      boardName: boardName ?? (boardIdForLookup ? `Доска ${boardIdForLookup}` : 'Неизвестная доска'),
      projectName: projectName ?? (projectId ? `Проект ${projectId}` : 'Неизвестный проект'),
    };
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

  // Получаем выбранные ключи в порядке выбора
  const orderedKeys = (set: Set<string>) => {
    return Array.from(set);
  };

  const doneKeys = useMemo(() => orderedKeys(selectedDone), [selectedDone]);
  const planKeys = useMemo(() => orderedKeys(selectedPlan), [selectedPlan]);

  // всего слайдов: выбор1 + формыDone + выбор2 + формыPlan + финал
  const stepsCount = 1 + doneKeys.length + 1 + planKeys.length + 1;

  const goTo = (i: number) => {
    const safe = Math.max(0, Math.min(i, stepsCount - 1));
    setStep(safe);
  };

  useEffect(() => {
    if (step > stepsCount - 1) setStep(stepsCount - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepsCount]);
  useEffect(() => {
    if (!isClient) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, isClient]);

  const resetWizard = useCallback(() => {
    setSelectedDone(() => new Set());
    setSelectedPlan(() => new Set());
    setDoneNotes({});
    setPlanNotes({});
    setSelectedProblems(() => new Set());
    setNeedHelp(null);
    setHelpComments({});
    setSelectedHelpers([]);
    setReportDate(() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    });
    setTaskMap(new Map());
    setImprovingKey(null);
    setStep(0);
    setShowSuccessModal(false);
    setPickerResetToken((prev) => prev + 1);
    improveReportMutation.reset();
    createReportMutation.reset();
  }, [createReportMutation, improveReportMutation]);

  const toggleDone = (boardId: string, taskId: string) => {
    setSelectedDone((prev) => {
      const n = new Set(prev);
      const key = `${boardId}:${taskId}`;
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const togglePlan = (boardId: string, taskId: string) => {
    setSelectedPlan((prev) => {
      const n = new Set(prev);
      const key = `${boardId}:${taskId}`;
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleProblem = (problemId: string) => {
    setSelectedProblems((prev) => {
      const n = new Set(prev);
      n.has(problemId) ? n.delete(problemId) : n.add(problemId);
      return n;
    });
  };

  const renderTaskLabel = (key: string) => {
    const taskInfo = taskMap.get(key);
    
    if (taskInfo) {
      return `${taskInfo.projectName} — ${taskInfo.boardName} — ${taskInfo.taskTitle}`;
    }
    
    // Fallback если данные еще не загружены
    return "Загрузка информации о задаче...";
  };

  // Слайды
  const slides: React.ReactNode[] = [];
  let idx = 0;

  // (0) выбор "сегодня сделал(а)"
  {
    const i0 = idx;
    slides.push(
      <div key={`slide-${i0}`} className="flex flex-col justify-between">
        <div className="rounded-2xl t-surface-no-shadow bg-white/5 border border-white/10 p-6 ring-1 ring-white/5">
          <ReportProjectPicker
            key={`done-${pickerResetToken}`}
            selected={selectedDone}
            onToggle={toggleDone}
            onTaskInfoUpdate={updateTaskMap}
            title="Выберите задачи, по которым вы сегодня работали"
            description="Выберите задачи из ваших проектов и досок."
          />
        </div>
        <WizardNav
          onNext={() => selectedDone.size > 0 && goTo(i0 + 1)}
          nextDisabled={selectedDone.size === 0}
        />
      </div>
    );
    idx++;
  }

  // (1..n) формы "что сделал(а)"
  doneKeys.forEach((k) => {
    const i1 = idx; // фикс индекса
    const handleImprove = async () => {
      const key = k;
      const parts = key.split(':');
      const taskId = parts.length > 1 ? parts[1] : parts[0];
      if (!taskId) {
        console.warn('Не удалось определить taskId для улучшения отчета', key);
        return;
      }

      const currentText = doneNotes[key] ?? '';
      setImprovingKey(key);
      try {
        const result = await improveReportMutation.mutateAsync({
          taskId,
          userText: currentText,
        });
        const improvedText = typeof result?.improved_text === 'string' && result.improved_text.trim().length > 0
          ? result.improved_text
          : currentText;
        setDoneNotes((prev) => ({ ...prev, [key]: improvedText }));
      } catch (error) {
        console.error('Ошибка при генерации комментария отчета', error);
        alert('Не удалось сгенерировать комментарий. Попробуйте позже.');
      } finally {
        setImprovingKey((prev) => (prev === key ? null : prev));
      }
    };

    slides.push(
      <div key={`slide-${i1}`} className="flex flex-col justify-between">
        <NotesForm
          title="Напишите, что вы сделали по задаче:"
          taskLabel={renderTaskLabel(k)}
          value={doneNotes[k] ?? ''}
          placeholder="Опишите выполненную работу…"
          onChange={(v) => setDoneNotes((prev) => ({ ...prev, [k]: v }))}
          onImproveClick={() => { void handleImprove(); }}
          isImproving={improvingKey === k && improveReportMutation.isPending}
        />
        <WizardNav  onPrev={() => goTo(i1 - 1)} onNext={() => goTo(i1 + 1)} />
      </div>
    );
    idx++;
  });

  // выбор "план на завтра"
  {
    const i2 = idx;
    slides.push(
      <div key={`slide-${i2}`} className="flex flex-col justify-between">
        <div className="rounded-2xl t-surface-no-shadow bg-white/5 border border-white/10 p-6 ring-1 ring-white/5">
          <ReportProjectPicker
            key={`plan-${pickerResetToken}`}
            selected={selectedPlan}
            onToggle={togglePlan}
            onTaskInfoUpdate={updateTaskMap}
            title="Выберите задачи для плана на завтра"
            description="Выберите задачи из ваших проектов и досок."
          />
        </div>
        <WizardNav

          onPrev={() => goTo(i2 - 1)}
          onNext={() => selectedPlan.size > 0 && goTo(i2 + 1)}
          nextDisabled={selectedPlan.size === 0}
        />
      </div>
    );
    idx++;
  }

  // формы по планам
  planKeys.forEach((k) => {
    const i3 = idx;
    slides.push(
      <div key={`slide-${i3}`} className="flex flex-col justify-between">
        <NotesForm
          title="План на завтра по задаче:"
          taskLabel={renderTaskLabel(k)}
          value={planNotes[k] ?? ''}
          placeholder="Что планируете сделать завтра…"
          onChange={(v) => setPlanNotes((prev) => ({ ...prev, [k]: v }))}
        />
        <WizardNav  onPrev={() => goTo(i3 - 1)} onNext={() => goTo(i3 + 1)} />
      </div>
    );
    idx++;
  });

  // финал
  {
    const i4 = idx;
    
    const handleSubmit = async () => {
        try {
            const userId = getUserId();
            if (!userId) {
                alert('Ошибка: пользователь не авторизован');
                return;
            }

            // Формируем данные для API
            const completeWork = doneKeys.map((key) => {
                // Извлекаем taskId из составного ключа "boardId:taskId"
                const taskId = key.includes(':') ? key.split(':')[1] : key;
                return {
                    task_id: taskId,
                    description: doneNotes[key] || '',
                };
            });

            const planTomorrow = planKeys.map((key) => {
                // Извлекаем taskId из составного ключа "boardId:taskId"
                const taskId = key.includes(':') ? key.split(':')[1] : key;
                return {
                    id: key, // Используем составной ключ как id
                    task_id: taskId,
                    description: planNotes[key] || '',
                };
            });

            const helpRequests = selectedHelpers.map((helper) => ({
                helper_id: helper.id,
                description: helpComments[helper.id] || '',
                status: 'pending', // Статус по умолчанию
            }));

            // Преобразуем выбранную дату в формат ISO
            const reportDateISO = new Date(reportDate + 'T00:00:00').toISOString();

            const payload = {
                complete_work: completeWork,
                help: helpRequests,
                plan_tomorrow: planTomorrow,
                problems: Array.from(selectedProblems),
                report_date: reportDateISO,
                user_id: userId,
            };

            await createReportMutation.mutateAsync(payload);
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Ошибка при создании отчета:', error);
            alert('Ошибка при создании отчета. Попробуйте еще раз.');
        }
    };

    slides.push(
      <div key={`slide-${i4}`} className="flex flex-col justify-between">
        <FinalQuestions
          selectedProblems={selectedProblems}
          onToggleProblem={toggleProblem}
          needHelp={needHelp}
          setNeedHelp={setNeedHelp}
          helpComments={helpComments}
          setHelpComments={setHelpComments}
          onHelpersChange={setSelectedHelpers}
          reportDate={reportDate}
          setReportDate={setReportDate}
        />
        <WizardNav 
          onPrev={() => goTo(i4 - 1)} 
          onFinish={handleSubmit}
          isLoading={createReportMutation.isPending}
        />
      </div>
    );
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl p-6">
        <SlideTrack step={step}>{slides}</SlideTrack>
      </div>
      
      <SuccessModal 
        open={showSuccessModal}
        onClose={resetWizard}
      />
    </main>
  );
}
