'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAllUserProjects } from '@/features/projects/hooks';
import { useProjectBoards } from '@/features/boards/hooks';
import { useBoardTasksByProjectAndBoard } from '@/features/tasks/hooks';
import { isAuthed } from '@/lib/auth';
import type { TaskAssignee } from '@/features/tasks/types';

export type TaskInfo = {
  taskTitle: string;
  boardName: string;
  projectName: string;
  statusName?: string;
  statusColor?: string;
  priority?: number;
  assignees?: TaskAssignee[];
  description?: string;
  creatorName?: string;
  creatorEmail?: string;
};

export type ReportProjectPickerProps = {
  selected: Set<string>;              // ключ `${boardId}:${taskId}`
  onToggle: (boardId: string, taskId: string) => void;
  onTaskInfoUpdate?: (taskMap: Map<string, TaskInfo>) => void;
  title: string;
  description?: string;
};

export default function ReportProjectPicker({
  selected,
  onToggle,
  onTaskInfoUpdate,
  title,
  description,
}: ReportProjectPickerProps) {
  const hasCreds = isAuthed();
  const { data: projects, isLoading: projectsLoading } = useAllUserProjects(hasCreds);
  
  // Открываем все проекты, где уже есть выбранные задачи
  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const key of selected) {
      const [boardId] = key.split(':');
      // Найдем проект по boardId
      if (projects) {
        for (const project of projects) {
          // Здесь нужно будет получить доски проекта и проверить, есть ли среди них boardId
          // Пока что просто добавляем все проекты
          open.add(project.id);
        }
      }
    }
    return open;
  }, [selected, projects]);

  const [openProjectIds, setOpenProjectIds] = useState<Set<string>>(new Set());
  const [openBoardIds, setOpenBoardIds] = useState<Set<string>>(new Set());
  
  // Собираем информацию о всех задачах
  const [allTaskInfo, setAllTaskInfo] = useState<Map<string, TaskInfo>>(new Map());

  // Передаем информацию о задачах в родительский компонент
  useEffect(() => {
    if (onTaskInfoUpdate && allTaskInfo.size > 0) {
      onTaskInfoUpdate(allTaskInfo);
    }
  }, [allTaskInfo, onTaskInfoUpdate]);

  const toggleProject = (projectId: string) => {
    setOpenProjectIds((prev) => {
      const n = new Set(prev);
      n.has(projectId) ? n.delete(projectId) : n.add(projectId);
      return n;
    });
  };

  const toggleBoard = (boardId: string) => {
    setOpenBoardIds((prev) => {
      const n = new Set(prev);
      n.has(boardId) ? n.delete(boardId) : n.add(boardId);
      return n;
    });
  };

  if (projectsLoading) {
    return (
      <section className="flex flex-col justify-start">
        <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
        {description && <p className="text-slate-300 mb-4">{description}</p>}
        <div className="text-slate-400">Загрузка проектов...</div>
      </section>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <section className="flex flex-col justify-start">
        <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
        {description && <p className="text-slate-300 mb-4">{description}</p>}
        <div className="text-slate-400">Нет доступных проектов</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col justify-start">
      <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
      {description && <p className="text-slate-300 mb-4">{description}</p>}

      <div className="space-y-6">
        {projects.map((project) => {
          const projectOpen = openProjectIds.has(project.id);
          return (
            <div key={project.id} className="space-y-3">
              {/* Название проекта (ненажимаемое) */}
              <div className="text-xl font-semibold text-slate-200 px-2">
                {project.name}
              </div>
              <ProjectBoards 
                projectId={project.id}
                projectName={project.name}
                projectOpen={projectOpen}
                openBoardIds={openBoardIds}
                onToggleBoard={toggleBoard}
                selected={selected}
                onToggle={onToggle}
                onTaskInfoUpdate={setAllTaskInfo}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Компонент для отображения досок проекта
function ProjectBoards({ 
  projectId, 
  projectName,
  projectOpen, 
  openBoardIds, 
  onToggleBoard, 
  selected, 
  onToggle,
  onTaskInfoUpdate
}: {
  projectId: string;
  projectName: string;
  projectOpen: boolean;
  openBoardIds: Set<string>;
  onToggleBoard: (boardId: string) => void;
  selected: Set<string>;
  onToggle: (boardId: string, taskId: string) => void;
  onTaskInfoUpdate?: (taskMap: Map<string, TaskInfo>) => void;
}) {
  const hasCreds = isAuthed();
  const { data: boards, isLoading: boardsLoading } = useProjectBoards(projectId, hasCreds);

  if (boardsLoading) {
    return <div className="text-slate-400 text-sm ml-4">Загрузка досок...</div>;
  }

  if (!boards || boards.length === 0) {
    return <div className="text-slate-400 text-sm ml-4">Нет досок в проекте</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
      {boards.map((board) => {
        const boardOpen = openBoardIds.has(board.id);
        return (
          <div
            key={board.id}
            onClick={() => onToggleBoard(board.id)}
            className={[
              'relative overflow-hidden cursor-pointer select-none',
              'rounded-2xl p-5 ring-1 ring-white/5',
              't-surface bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors',
              boardOpen ? 'ring-2 ring-emerald-500/40' : '',
            ].join(' ')}
          >
            {/* мягкая подложка при открытии */}
            <div
              className={[
                'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
                boardOpen
                  ? 'opacity-100 bg-gradient-to-br from-emerald-600 to-lime-500'
                  : 'opacity-0',
              ].join(' ')}
            />
            <div className="relative z-[1]">
              <div className={`text-xl font-semibold ${boardOpen ? 'text-black' : 'text-white'}`}>{board.name}</div>
              {board.description && (
                <div className={`mt-1 ${boardOpen ? 'text-gray-900' : 'text-slate-300'}`}>{board.description}</div>
              )}

              <div
                data-open={boardOpen}
                className={[
                  'mt-4 overflow-hidden transition-all duration-300',
                  'max-h-0 opacity-0 translate-y-2',
                  'data-[open=true]:max-h-[60vh] data-[open=true]:overflow-y-auto data-[open=true]:pr-2 data-[open=true]:-mr-2',
                  'data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
                ].join(' ')}
              >
                <BoardTasks 
                  projectId={projectId}
                  projectName={projectName}
                  boardId={board.id}
                  boardName={board.name}
                  selected={selected}
                  onToggle={onToggle}
                  onTaskInfoUpdate={onTaskInfoUpdate}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Компонент для отображения задач доски
function BoardTasks({ 
  projectId,
  projectName,
  boardId,
  boardName,
  selected, 
  onToggle,
  onTaskInfoUpdate
}: {
  projectId: string;
  projectName: string;
  boardId: string;
  boardName: string;
  selected: Set<string>;
  onToggle: (boardId: string, taskId: string) => void;
  onTaskInfoUpdate?: (taskMap: Map<string, TaskInfo>) => void;
}) {
  const { data: tasks, isLoading: tasksLoading } = useBoardTasksByProjectAndBoard(projectId, boardId);


  // Обновляем информацию о задачах
  useEffect(() => {
    if (tasks && tasks.length > 0 && onTaskInfoUpdate) {
      const taskMap = new Map<string, TaskInfo>();
      tasks.forEach(task => {
        const key = `${boardId}:${task.id}`;
        const status = Array.isArray(task.statuses)
          ? task.statuses.find((item) => item?.boardId === boardId) ?? task.statuses[0]
          : undefined;
        taskMap.set(key, {
          taskTitle: task.title,
          boardName,
          projectName,
          statusName: status?.name ?? status?.key,
          statusColor: status?.color,
          priority: task.priority,
          assignees: task.assignees,
          description: task.description,
        });
      });

      // Обновляем общую карту задач
      onTaskInfoUpdate(taskMap);
    }
  }, [tasks, boardId, boardName, projectName, onTaskInfoUpdate]);

  if (tasksLoading) {
    return <div className="text-slate-400 text-sm">Загрузка задач...</div>;
  }

  if (!tasks || tasks.length === 0) {
    return <div className="text-slate-400 text-sm">Нет задач в доске</div>;
  }

  // Новый хук уже возвращает задачи конкретной доски, поэтому фильтрация не нужна
  if (tasks.length === 0) {
    return <div className="text-slate-400 text-sm">Нет задач в этой доске</div>;
  }

  return (
    <ul className="space-y-2 pr-2">
      {tasks.map((task) => {
        const key = `${boardId}:${task.id}`;
        const isPicked = selected.has(key);
        return (
          <li
            key={task.id}
            onClick={(e) => {
              e.stopPropagation(); // не сворачивать карточку
              onToggle(boardId, task.id);
            }}
            className={[
              'rounded-lg px-4 py-2 transition-colors cursor-pointer select-none',
              isPicked
                ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black border border-cyan-400'
                : 'bg-black/20 text-slate-200 ring-white/10 hover:bg-black/30',
            ].join(' ')}
          >
            {task.title}
          </li>
        );
      })}
    </ul>
  );
}
