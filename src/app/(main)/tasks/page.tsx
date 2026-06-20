'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useMyTasks } from '@/features/tasks/hooks';
import { getTaskPriorityMeta, TASK_PRIORITY_OPTIONS } from '@/features/tasks/types';
import { formatDateShort } from '@/lib/date';

export default function MyTasksPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: tasks = [], isLoading } = useMyTasks(1, 100, hasCreds);

  const [query, setQuery] = useState('');
  const [priority, setPriority] = useState<number | ''>('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((t) => {
      if (q && !t.title.toLowerCase().includes(q) && !(t.projectName ?? '').toLowerCase().includes(q)) return false;
      if (priority !== '' && (t.priority ?? 0) !== priority) return false;
      return true;
    });
  }, [tasks, query, priority]);

  // Группируем по проекту
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      const key = t.projectName || 'Без проекта';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ru'));
  }, [filtered]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-heading text-app">Мои задачи</h1>
          <p className="t-body mt-1">Активные задачи по всем проектам</p>
        </div>
        <div className="t-surface rounded-xl px-4 py-2 text-center">
          <div className="text-2xl font-bold text-emerald-400">{isLoading ? '—' : tasks.length}</div>
          <div className="text-xs text-app-3">активных</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по задаче или проекту…"
          className="t-input w-full sm:w-72"
        />
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value === '' ? '' : Number(e.target.value))}
          className="t-input w-auto"
        >
          <option value="">Все приоритеты</option>
          {TASK_PRIORITY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {(query || priority !== '') && (
          <button onClick={() => { setQuery(''); setPriority(''); }}
            className="rounded-xl px-3 py-2 text-sm text-app-2 hover:text-app hover:bg-app-subtle transition-colors">
            Сбросить
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="t-body py-6">Загрузка…</div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app px-6 py-12 text-center">
          <div className="text-3xl mb-2">✅</div>
          <div className="t-body">У вас нет активных задач</div>
          <Link href="/projects" className="btn-ghost mt-4 inline-block">К проектам →</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-app px-6 py-10 text-center">
          <div className="t-body">Ничего не найдено</div>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([project, items]) => (
            <div key={project}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-app">📁 {project}</span>
                <span className="rounded-full bg-app-hover text-app-2 text-xs px-2 py-0.5">{items.length}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((t) => {
                  const pm = getTaskPriorityMeta(t.priority);
                  return (
                    <Link key={t.id} href={`/tasks/${t.id}`}
                      className="t-surface-hover rounded-2xl p-4 ring-1 ring-app hover:ring-app transition-all block">
                      <div className="font-medium text-app line-clamp-2">{t.title}</div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${pm.badgeClass}`}>
                          {pm.label}
                        </span>
                        {t.due && <span className="t-caption">до {formatDateShort(t.due)}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
