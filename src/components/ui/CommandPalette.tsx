'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { http } from '@/lib/http';

type Result = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  kind: 'task' | 'project';
};

async function searchAll(q: string): Promise<Result[]> {
  const [tasks, projects] = await Promise.allSettled([
    http(`/task/search?q=${encodeURIComponent(q)}&page=1&pageSize=5`).then(r => r.json()),
    http(`/project/search?q=${encodeURIComponent(q)}`).then(r => r.json()),
  ]);

  const results: Result[] = [];

  if (tasks.status === 'fulfilled') {
    const list: any[] = tasks.value?.tasks ?? [];
    list.slice(0, 5).forEach(t => results.push({
      id: `task-${t.id}`, title: t.name, subtitle: t.project?.name,
      href: `/tasks/${t.id}`, kind: 'task',
    }));
  }
  if (projects.status === 'fulfilled') {
    const list: any[] = Array.isArray(projects.value) ? projects.value : projects.value?.projects ?? [];
    list.slice(0, 4).forEach(p => results.push({
      id: `proj-${p.id}`, title: p.name, subtitle: p.description,
      href: `/projects/${p.id}`, kind: 'project',
    }));
  }
  return results;
}

export default function CommandPalette() {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor]   = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router   = useRouter();

  const close = useCallback(() => { setOpen(false); setQuery(''); setResults([]); }, []);

  // Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(v => !v); }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [close]);

  // Auto-focus
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

  // Search with debounce
  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchAll(query)); } finally { setLoading(false); }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Keyboard navigation
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center pt-[15vh] px-4 bg-black/50 backdrop-blur-sm animate-fade-in-scale"
      onClick={e => e.target === e.currentTarget && close()}
    >
      <div className="w-full max-w-xl t-surface rounded-2xl ring-1 ring-white/15 shadow-2xl overflow-hidden animate-fade-in-scale">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <svg className="w-5 h-5 text-slate-400 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск задач и проектов…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 focus:outline-none text-base"
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-emerald-400/40 border-t-emerald-400 rounded-full animate-spin-slow shrink-0" />
          )}
          <kbd className="hidden sm:inline-flex items-center rounded border border-white/10 px-1.5 py-0.5 text-xs text-slate-500 font-mono shrink-0">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {!query.trim() && (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              Начните вводить для поиска задач и проектов
            </div>
          )}
          {query.trim() && !loading && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              Ничего не найдено по «{query}»
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r.href)}
              onMouseEnter={() => setCursor(i)}
              className={[
                'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                i === cursor ? 'bg-emerald-500/10' : 'hover:bg-white/5',
              ].join(' ')}
            >
              <span className={[
                'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold',
                r.kind === 'task'    ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400',
              ].join(' ')}>
                {r.kind === 'task' ? 'T' : 'P'}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white truncate">{r.title}</div>
                {r.subtitle && <div className="text-xs text-slate-500 truncate">{r.subtitle}</div>}
              </div>
              {i === cursor && <kbd className="text-xs text-slate-500 font-mono">↵</kbd>}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-white/5 text-xs text-slate-600">
          <span><kbd className="font-mono">↑↓</kbd> навигация</span>
          <span><kbd className="font-mono">↵</kbd> открыть</span>
          <span><kbd className="font-mono">Esc</kbd> закрыть</span>
          <span className="ml-auto">T — задача · P — проект</span>
        </div>
      </div>
    </div>
  );
}
