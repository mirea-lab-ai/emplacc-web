'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { http } from '@/lib/http';
import { getUserId } from '@/lib/auth';

type ResultKind = 'task' | 'project' | 'team' | 'forum';

type Result = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  kind: ResultKind;
};

const KIND_META: Record<ResultKind, { label: string; color: string }> = {
  task:    { label: 'T', color: 'bg-emerald-500/15 text-emerald-400' },
  project: { label: 'P', color: 'bg-blue-500/15 text-blue-400' },
  team:    { label: 'К', color: 'bg-orange-500/15 text-orange-400' },
  forum:   { label: 'Ф', color: 'bg-purple-500/15 text-purple-400' },
};

async function searchAll(q: string): Promise<Result[]> {
  const uid = getUserId() ?? '';
  const base = `query=${encodeURIComponent(q)}&user_id=${encodeURIComponent(uid)}&page=1&pagesize=5`;
  const ql = q.toLowerCase();

  const [tasks, projects, teams, problems] = await Promise.allSettled([
    http(`/task/search?${base}`).then(r => r.json()),
    http(`/project/search?${base}`).then(r => r.json()),
    http('/team/all').then(r => r.json()),
    http(`/problem/search?${base}`).then(r => r.json()),
  ]);

  const results: Result[] = [];

  if (tasks.status === 'fulfilled') {
    (tasks.value?.tasks ?? []).slice(0, 4).forEach((t: any) => results.push({
      id: `task-${t.id}`, title: t.name, subtitle: t.project?.name,
      href: `/tasks/${t.id}`, kind: 'task',
    }));
  }

  if (projects.status === 'fulfilled') {
    const list: any[] = Array.isArray(projects.value) ? projects.value : projects.value?.projects ?? [];
    list.slice(0, 3).forEach(p => results.push({
      id: `proj-${p.id}`, title: p.name, subtitle: p.description,
      href: `/projects/${p.id}`, kind: 'project',
    }));
  }

  if (teams.status === 'fulfilled') {
    const list: any[] = Array.isArray(teams.value) ? teams.value : teams.value?.teams ?? [];
    list
      .filter((t: any) => t.name?.toLowerCase().includes(ql))
      .slice(0, 3)
      .forEach((t: any) => {
        const members = (t.members ?? []).map((m: any) =>
          `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim()).filter(Boolean).slice(0, 3).join(', ');
        results.push({
          id: `team-${t.id}`, title: t.name, subtitle: members || undefined,
          href: `/teams?team=${t.id}`, kind: 'team',
        });
      });
  }

  if (problems.status === 'fulfilled') {
    const list: any[] = problems.value?.problems ?? [];
    list.slice(0, 3).forEach((p: any) => results.push({
      id: `forum-${p.id}`,
      title: p.name,
      subtitle: Array.isArray(p.description) ? p.description.join(' ') : p.description,
      href: `/forum?problem=${p.id}`, kind: 'forum',
    }));
  }

  return results;
}

function useShortcutLabel() {
  const [label, setLabel] = useState('Ctrl+K');
  useEffect(() => {
    const p = navigator.platform?.toLowerCase() ?? '';
    const ua = navigator.userAgent?.toLowerCase() ?? '';
    if (p.includes('mac') || ua.includes('mac os')) setLabel('⌘K');
    else if (p.includes('win') || ua.includes('windows')) setLabel('Win+K');
    else setLabel('Ctrl+K'); // Linux и прочие
  }, []);
  return label;
}

export default function CommandPalette() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();
  const shortcutLabel = useShortcutLabel();

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]); }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(v => !v); }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchAll(query)); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
      if (e.key === 'Enter' && results[cursor]) { navigate(results[cursor].href); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, cursor, results]);

  useEffect(() => { setCursor(0); }, [results]);

  function navigate(href: string) { close(); router.push(href); }

  // Group results by kind for display
  const grouped = results.reduce<{ kind: ResultKind; items: Result[] }[]>((acc, r) => {
    const group = acc.find(g => g.kind === r.kind);
    if (group) group.items.push(r);
    else acc.push({ kind: r.kind, items: [r] });
    return acc;
  }, []);

  const kindLabel: Record<ResultKind, string> = {
    task: 'Задачи', project: 'Проекты', team: 'Команды', forum: 'Форум',
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm animate-fade-in-scale"
      onClick={e => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
      aria-label="Командная палитра"
    >
      <div className="w-full max-w-xl t-surface rounded-2xl ring-1 ring-app shadow-2xl overflow-hidden animate-fade-in-scale">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-app">
          <svg className="w-5 h-5 text-app-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск задач, проектов, команд, форума…"
            className="flex-1 bg-transparent text-app placeholder-slate-500 focus:outline-none text-base"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="cmdk-listbox"
            aria-autocomplete="list"
            aria-activedescendant={results[cursor] ? `cmdk-opt-${results[cursor].id}` : undefined}
            aria-label="Поиск"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin-slow shrink-0" />
          )}
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <kbd className="inline-flex items-center rounded border border-app px-1.5 py-0.5 text-xs text-app-3 font-mono">{shortcutLabel}</kbd>
            <kbd className="inline-flex items-center rounded border border-app px-1.5 py-0.5 text-xs text-app-3 font-mono">Esc</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto py-2" role="listbox" id="cmdk-listbox" aria-label="Результаты поиска">
          {!query.trim() && (
            <div className="px-4 py-6 text-sm text-app-3 text-center space-y-1">
              <div>Начните вводить для поиска</div>
              <div className="text-xs text-app-3 flex justify-center gap-3 flex-wrap pt-1">
                {Object.entries(kindLabel).map(([k, l]) => (
                  <span key={k} className="flex items-center gap-1">
                    <span className={`inline-grid h-5 w-5 place-items-center rounded text-[10px] font-bold ${KIND_META[k as ResultKind].color}`}>
                      {KIND_META[k as ResultKind].label}
                    </span>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <div className="px-4 py-6 text-sm text-app-3 text-center">
              Ничего не найдено по «{query}»
            </div>
          )}

          {grouped.map(group => {
            const flatStart = results.findIndex(r => r.id === group.items[0].id);
            return (
              <div key={group.kind}>
                <div className="px-4 py-1.5 text-[11px] font-semibold text-app-3 uppercase tracking-wider">
                  {kindLabel[group.kind]}
                </div>
                {group.items.map((r, relIdx) => {
                  const i = flatStart + relIdx;
                  const meta = KIND_META[r.kind];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="option"
                      id={`cmdk-opt-${r.id}`}
                      aria-selected={i === cursor}
                      onClick={() => navigate(r.href)}
                      onMouseEnter={() => setCursor(i)}
                      className={[
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        i === cursor ? 'bg-emerald-500/10' : 'hover:bg-app-hover',
                      ].join(' ')}
                    >
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${meta.color}`}>
                        {meta.label}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-app truncate">{r.title}</div>
                        {r.subtitle && <div className="text-xs text-app-3 truncate">{r.subtitle}</div>}
                      </div>
                      {i === cursor && <kbd className="text-xs text-app-3 font-mono shrink-0">↵</kbd>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-app text-xs text-app-3">
          <span><kbd className="font-mono">↑↓</kbd> навигация</span>
          <span><kbd className="font-mono">↵</kbd> открыть</span>
          <span><kbd className="font-mono">Esc</kbd> закрыть</span>
        </div>
      </div>
    </div>
  );
}
