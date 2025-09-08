'use client';

import { useMemo, useState } from 'react';

export type Subtask = { id: string; title: string };
export type Task = { id: string; title: string; subtasks: Subtask[] };

export default function TaskGrid({
                                   tasks,
                                 }: {
  tasks: Task[];
}) {
  // какие карточки раскрыты
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setOpen((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {tasks.map((t) => (
        <TaskCard
          key={t.id}
          task={t}
          open={open.has(t.id)}
          onToggle={() => toggle(t.id)}
        />
      ))}
    </div>
  );
}

/* ------------ Card ------------ */

function TaskCard({
                    task,
                    open,
                    onToggle,
                  }: {
  task: Task;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      onClick={onToggle}
      className={[
        'relative overflow-hidden cursor-pointer select-none',
        'rounded-2xl p-5 ring-1 ring-white/5',
        'bg-[#141c2f] hover:bg-[#16213a] transition-colors',
        open ? 'ring-2 ring-indigo-500/40' : '',
      ].join(' ')}
    >
      {/* градиент как у других карточек */}
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
        <div className="text-slate-400 text-sm mt-0.5">
          {task.subtasks.length
            ? `Подзадач: ${task.subtasks.length}`
            : 'Подзадач нет'}
        </div>

        <div
          data-open={open}
          className={[
            'mt-4 overflow-hidden transition-all duration-300',
            'max-h-0 opacity-0 translate-y-2',
            'data-[open=true]:max-h-60 data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
          ].join(' ')}
          onClick={(e) => e.stopPropagation()}
        >
          {task.subtasks.length === 0 ? (
            <div className="rounded-lg bg-black/20 px-4 py-3 text-slate-400 ring-1 ring-white/10">
              Нет подзадач
            </div>
          ) : (
            <ul className="space-y-2">
              {task.subtasks.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg bg-black/20 px-4 py-2 text-slate-200 ring-1 ring-white/10"
                >
                  {s.title}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
