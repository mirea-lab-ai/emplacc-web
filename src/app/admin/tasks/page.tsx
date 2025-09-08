'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import TaskGrid, { Task } from '@/components/admin/tasks/TaskGrid';
import CreateTaskModal from '@/components/admin/tasks/CreateTaskModal';

const demo: Task[] = [
  {
    id: 't1',
    title: 'Design System',
    subtasks: [
      { id: 's11', title: 'Buttons & Inputs' },
      { id: 's12', title: 'Modals & Alerts' },
      { id: 's13', title: 'Cards & Lists' },
    ],
  },
  {
    id: 't2',
    title: 'Write Documentation',
    subtasks: [
      { id: 's21', title: 'Auth & Sessions' },
      { id: 's22', title: 'Rate Limits' },
    ],
  },
  {
    id: 't3',
    title: 'Team Meeting',
    subtasks: [{ id: 's31', title: 'Agenda Prep' }],
  },
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  // демо-персист в localStorage
  useEffect(() => {
    const raw = localStorage.getItem('tasks');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Task[];
        setTasks(parsed);
        return;
      } catch {}
    }
    setTasks(demo);
  }, []);
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const addTask = (t: Task) => setTasks((arr) => [t, ...arr]);

  return (
    <main className="min-h-screen bg-[#0f1422] text-white">
      <div className="mx-auto max-w-6xl p-6 space-y-6">
        <Panel className="px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">Задачи</h1>
              <p className="text-slate-400">Кликайте по задаче, чтобы посмотреть подзадачи</p>
            </div>
            <button
              onClick={() => setOpenCreate(true)}
              className="rounded-xl bg-[#3452ff] px-5 py-2 font-semibold text-white hover:brightness-110 active:translate-y-px"
            >
              + Создать задачу
            </button>
          </div>
        </Panel>

        <Panel className="p-6">
          <TaskGrid tasks={tasks} />
        </Panel>
      </div>

      <CreateTaskModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={addTask}
      />
    </main>
  );
}
