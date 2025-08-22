'use client';

import { useMemo, useState } from 'react';
import Header from '@/components/Header';
import TimerBar from '@/components/TimerBar';
import TaskList, { Task } from '@/components/TaskList';

export default function Page() {
  // демо-данные
  const tasks: Task[] = useMemo(
    () => [
      {
        id: 't1',
        title: 'Дрон Гараж',
        subtitle: 'Create Components',
        subtasks: [
          { id: 's11', title: 'Buttons & Inputs' },
          { id: 's12', title: 'Modals & Alerts' },
          { id: 's13', title: 'Cards & Lists' },
        ],
      },
      {
        id: 't2',
        title: 'Emplacc',
        subtitle: 'API Reference',
        subtasks: [
          { id: 's21', title: 'Фронт' },
          { id: 's22', title: 'Бэк' }
        ],
      },
      {
        id: 't3',
        title: 'Буратино',
        subtitle: 'Discuss Q3 Goals',
        subtasks: [
          { id: 's31', title: 'Agenda Prep' },
          { id: 's32', title: 'Notes & Action Items' },
        ],
      },
    ],
    []
  );

  // простой «рабочий» таймер
  const [seconds, setSeconds] = useState(42); // старт как на картинке – 0:42
  const [running, setRunning] = useState(false);

  // плавный тиковый цикл
  useState(() => {
    const id = setInterval(() => {
      setSeconds((s) => (running && s < 60 * 25 ? s + 1 : s)); // до 25 мин демо
    }, 1000);
    return () => clearInterval(id);
  });

  const handleStart = () => setRunning(true);
  const handleBreak = () => setRunning(false);
  const handleComplete = () => {
    setRunning(false);
    setSeconds(0);
  };

  // процент прогресса для полосы
  const progress = Math.min(100, Math.round((seconds / (60 * 25)) * 100)); // 25 мин за 100%

  return (
    <main className="min-h-screen bg-[#0f1422] text-white">
      <div className="mx-auto max-w-6xl p-6">

        <section className="mt-6 rounded-2xl bg-[#111829]/80 p-6 ring-1 ring-white/5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)]">
          <TimerBar
            seconds={seconds}
            progress={progress}
            onStart={handleStart}
            onBreak={handleBreak}
            onComplete={handleComplete}
            running={running}
          />
        </section>

        <section className="mt-8 rounded-2xl bg-[#111829]/70 p-6 ring-1 ring-white/5">
          <h2 className="text-3xl font-semibold tracking-tight mb-4">Выбрать задачу</h2>
          <TaskList tasks={tasks} />
        </section>
      </div>
    </main>
  );
}
