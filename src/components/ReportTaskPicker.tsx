'use client';

import { useMemo, useState } from 'react';

export type Subtask = { id: string; title: string };
export type Task = {
  id: string;
  title: string;
  subtitle: string;
  subtasks: Subtask[];
};

export type ReportTaskPickerProps = {
  tasks: Task[];
  selected: Set<string>;              // ключ `${taskId}:${subId}`
  onToggle: (taskId: string, subId: string) => void;
  title: string;
  description?: string;
};

export default function ReportTaskPicker({
                                           tasks,
                                           selected,
                                           onToggle,
                                           title,
                                           description,
                                         }: ReportTaskPickerProps) {
  // Открываем все карточки, где уже есть выбранные подпункты
  const initiallyOpen = useMemo(() => {
    const open = new Set<string>();
    for (const key of selected) {
      const [t] = key.split(':');
      open.add(t);
    }
    return open;
  }, [selected]);

  const [openIds, setOpenIds] = useState<Set<string>>(initiallyOpen);

  const toggleOpen = (id: string) => {
    setOpenIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  return (
    <section className="flex flex-col justify-start">
      <h2 className="text-3xl font-semibold tracking-tight mb-2">{title}</h2>
      {description && <p className="text-slate-300 mb-4">{description}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((t) => {
          const open = openIds.has(t.id);
          return (
            <div
              key={t.id}
              onClick={() => toggleOpen(t.id)}
              className={[
                'relative overflow-hidden cursor-pointer select-none',
                'rounded-2xl p-5 ring-1 ring-white/5',
                'backdrop-blur-sm bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors',
                open ? 'ring-2 ring-emerald-500/40' : '',
              ].join(' ')}
            >
              {/* мягкая подложка при открытии */}
              <div
                className={[
                  'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
                  open
                    ? 'opacity-100 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400'
                    : 'opacity-0',
                ].join(' ')}
              />
              <div className="relative z-[1]">
                <div className="text-xl font-semibold">{t.title}</div>
                <div className="text-slate-300 mt-1">{t.subtitle}</div>

                <div
                  data-open={open}
                  className={[
                    'mt-4 overflow-hidden transition-all duration-300',
                    'max-h-0 opacity-0 translate-y-2',
                    'data-[open=true]:max-h-56 data-[open=true]:opacity-100 data-[open=true]:translate-y-0',
                  ].join(' ')}
                >
                  <ul className="space-y-2">
                    {t.subtasks.map((s) => {
                      const key = `${t.id}:${s.id}`;
                      const isPicked = selected.has(key);
                      return (
                        <li
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation(); // не сворачивать карточку
                            onToggle(t.id, s.id);
                          }}
                          className={[
                            'rounded-lg px-4 py-2 ring-1 transition-colors cursor-pointer select-none',
                            isPicked
                              ? 'bg-cyan-500 text-white ring-emerald-500/10 border-2 border-cyan-500'
                              : 'bg-black/20 text-slate-200 ring-white/10 hover:bg-black/30',
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
        })}
      </div>
    </section>
  );
}
