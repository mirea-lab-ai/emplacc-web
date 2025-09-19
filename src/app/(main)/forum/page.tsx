'use client';

import { useEffect, useMemo, useState } from 'react';
import Panel from '@/components/ui/Panel';
import TaskSidebar from '@/components/forum/TaskSidebar';
import ChatWindow, { Message } from '@/components/forum/ChatWindow';

type Task = { id: string; title: string; subtasks: { id: string; title: string }[] };

// демо-данные
const demoTasks: Task[] = [
  {
    id: 't1',
    title: 'Design System',
    subtasks: [
      { id: 's11', title: 'Buttons & Inputs' },
      { id: 's12', title: 'Modals & Alerts' },
    ],
  },
  {
    id: 't2',
    title: 'API Docs',
    subtasks: [
      { id: 's21', title: 'Auth & Sessions' },
      { id: 's22', title: 'Rate Limits' },
    ],
  },
  {
    id: 't3',
    title: 'Team Meeting',
    subtasks: [{ id: 's31', title: 'Agenda & Notes' }],
  },
];

const ME = { id: 'me', name: 'Вы' };

export default function ForumPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [threads, setThreads] = useState<Record<string, Message[]>>({}); // key: taskId

  // Безопасная загрузка из localStorage + сид стартового треда
  useEffect(() => {
    // 1) Загрузим задачи; если массив пустой/битый — берём демо
    let t: Task[] = demoTasks;
    const tRaw = localStorage.getItem('forum_tasks');
    if (tRaw) {
      try {
        const parsed = JSON.parse(tRaw) as Task[];
        if (Array.isArray(parsed) && parsed.length > 0) t = parsed;
      } catch {
        // ignore
      }
    }
    setTasks(t);

    // 2) Загрузим threads либо засеем для первой задачи (если есть)
    const thRaw = localStorage.getItem('forum_threads');
    if (thRaw) {
      try {
        const parsed = JSON.parse(thRaw) as Record<string, Message[]>;
        setThreads(parsed ?? {});
      } catch {
        setThreads({});
      }
    } else if (t.length > 0) {
      setThreads({
        [t[0].id]: [
          {
            id: uid(),
            author: { id: 'u1', name: 'Мария' },
            text: 'Коллеги, как продвигается дизайн кнопок?',
            ts: Date.now() - 3600_000,
          },
          {
            id: uid(),
            author: ME,
            text: 'Сделал состояния hover/active. Сегодня добью disabled.',
            ts: Date.now() - 3300_000,
            self: true,
          },
        ],
      });
    }

    // 3) Выберем активную задачу, только если она есть
    setActiveId(t.length > 0 ? t[0].id : '');
  }, []);

  // Персистим состояние
  useEffect(() => {
    localStorage.setItem('forum_tasks', JSON.stringify(tasks));
  }, [tasks]);
  useEffect(() => {
    localStorage.setItem('forum_threads', JSON.stringify(threads));
  }, [threads]);

  const activeTaskTitle = useMemo(
    () => tasks.find((t) => t.id === activeId)?.title ?? 'Задача',
    [tasks, activeId]
  );

  const sidebarTasks = useMemo(
    () =>
      tasks.map((t) => ({
        id: t.id,
        title: t.title,
        subtasksCount: t.subtasks.length,
      })),
    [tasks]
  );

  const messages = threads[activeId] ?? [];

  const send = (text: string) => {
    if (!activeId) return;
    const msg: Message = {
      id: uid(),
      author: ME,
      text,
      ts: Date.now(),
      self: true,
    };
    setThreads((th) => ({
      ...th,
      [activeId]: [...(th[activeId] ?? []), msg],
    }));
  };

  return (
    <main className="min-h-screen bg-emerald-950 text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <div className="flex gap-6">
          {/* левая колонка — задачи */}
          <Panel className="p-4 w-[320px] shrink-0 sticky top-6 self-start min-h-[520px] backdrop-blur-md bg-white/5 border border-white/10">
            <h2 className="text-lg font-semibold mb-3">Задачи</h2>
            <TaskSidebar tasks={sidebarTasks} activeId={activeId} onSelect={setActiveId}/>
          </Panel>

          {/* правая колонка — чат / плейсхолдер */}
          <div className="flex-1 min-w-0 ">
            {activeId ? (
              <ChatWindow taskTitle={activeTaskTitle} messages={messages} onSend={send}/>
            ) : (
              <Panel className="grid place-items-center min-h-[520px]">
                <div className="text-slate-400">Выберите задачу слева, чтобы открыть чат</div>
              </Panel>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
