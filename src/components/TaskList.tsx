'use client';

import { useState } from 'react';

export type Subtask = { id: string; title: string };
export type Task = {
  id: string;
  title: string;
  subtitle: string;
  subtasks: Subtask[];
};

export default function TaskList({ tasks }: { tasks: Task[] }) {
  const [activeTask, setActiveTask] = useState<string | null>(null);
  // единственная выбранная подзадача (глобально): `${taskId}:${subId}` или null
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const toggleTask = (id: string) =>
    setActiveTask((prev) => (prev === id ? null : id));

  const pickSub = (taskId: string, subId: string) => {
    const key = `${taskId}:${subId}`;
    setSelectedKey((prev) => (prev === key ? null : key)); // повторный клик снимает
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          open={activeTask === t.id}
          onToggle={() => toggleTask(t.id)}
          selectedKey={selectedKey}
          onPick={(subId) => pickSub(t.id, subId)}
        />
      ))}
    </div>
  );
}

function TaskCard({
                    task,
                    open,
                    onToggle,
                    selectedKey,
                    onPick,
                  }: {
  task: Task;
  open: boolean;
  onToggle: () => void;
  selectedKey: string | null;
  onPick: (subId: string) => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={[
        'relative overflow-hidden cursor-pointer select-none',
        'rounded-2xl p-5 ring-1 ring-app t-surface t-surface-hover transition-colors',
        open ? 'ring-2 ring-indigo-500/40' : '',
      ].join(' ')}
    >
      {/* градиентная подложка при открытии */}
      <div
        className={[
          'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
          open
            ? 'opacity-60 bg-gradient-to-r from-indigo-600 via-blue-600 to-fuchsia-600'
            : 'opacity-0',
        ].join(' ')}
      />

      <div className="relative z-[1]">
        <div className="text-xl font-semibold">{task.title}</div>
        <div className="text-app-2 mt-1">{task.subtitle}</div>

        <div
          data-open={open}
          className={[
            'mt-4 overflow-hidden transition-all duration-300',
            'max-h-0 opacity-0 translate-y-2',
            'data-[open=true]:max-h-56 data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
          ].join(' ')}
        >
          <ul className="space-y-2">
            {task.subtasks.map((s) => {
              const key = `${task.id}:${s.id}`;
              const isSelected = selectedKey === key;
              return (
                <li
                  key={s.id}
                  onClick={(e) => {
                    e.stopPropagation(); // чтобы не сворачивалась карточка
                    onPick(s.id);
                  }}
                  className={[
                    'rounded-lg px-4 py-2 ring-1 transition-colors cursor-pointer select-none',
                    isSelected
                      ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-500/50'
                      : 'bg-app-subtle text-app ring-app hover:bg-app-hover',
                  ].join(' ')}
                >
                  {s.title}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
