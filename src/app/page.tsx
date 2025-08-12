'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import TimerControls from '@/components/sections/TimerControls';
import Timeline from '@/components/sections/Timeline';
import UserCard from '@/components/sections/UserCard';
import TasksCard from '@/components/sections/TasksCard';
import DailyStats from '@/components/sections/DailyStats';
import { Task, TabKey } from '@/types';

export default function Page() {
  // вкладки
  const [tab, setTab] = useState<TabKey>('/');

  // таймер
  const plannedSeconds = 8 * 60 * 60;     // 8 часов
  const [elapsed, setElapsed] = useState(6 * 60 * 60 + 35 * 60); // 6:35
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setElapsed((s) => Math.min(s + 1, plannedSeconds));
    }, 1000);
    return () => clearInterval(id);
  }, [running, plannedSeconds]);

  // задачи (демо)
  const tasks: Task[] = [
    { id: 1, title: 'Задача 1', color: 'bg-sky-400' },
    { id: 2, title: 'Задача 2', color: 'bg-violet-400' },
    { id: 3, title: 'Задача 3', color: 'bg-emerald-400' },
  ];

  return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <Header tab={tab} onChange={setTab} />

        <main className="mx-auto max-w-6xl px-4 py-6">
          <TimerControls
              onStart={() => setRunning(true)}
              onPause={() => setRunning(false)}
              onFinish={() => { setRunning(false); setElapsed(plannedSeconds); }}
          />

          <Timeline elapsed={elapsed} plannedSeconds={plannedSeconds} />

          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            <UserCard />
            <TasksCard tasks={tasks} />
          </section>

          <DailyStats />
        </main>
      </div>
  );
}
