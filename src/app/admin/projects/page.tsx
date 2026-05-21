'use client';

import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { deleteProject } from '@/features/projects/api';
import { fetchAllProjects } from '@/features/teams/api';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';

export default function AdminProjectsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['adminProjects'],
    queryFn: () => fetchAllProjects(1, 200),
    enabled: hasCreds,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    let list = projects as any[];
    if (statusFilter !== 'all') list = list.filter(p => (p.status ?? 'active') === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    return list;
  }, [projects, search, statusFilter]);

  async function handleDelete(p: any) {
    if (!await confirm({ title: 'Удалить проект?', message: `«${p.name}» будет удалён вместе со всеми досками и статусами.`, danger: true, confirmLabel: 'Удалить' })) return;
    try {
      await deleteProject(p.id);
      toast.success(`Проект «${p.name}» удалён`);
      qc.invalidateQueries({ queryKey: ['adminProjects'] });
    } catch { toast.error('Не удалось удалить проект'); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="t-heading text-white">Проекты</h1>
          <p className="t-body mt-0.5">{(projects as any[]).length} проектов на платформе</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="flex rounded-xl ring-1 ring-white/10 overflow-hidden">
          {(['all','active','archived'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 text-sm transition-colors ${statusFilter === s ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-white'}`}>
              {s === 'all' ? 'Все' : s === 'active' ? 'Активные' : 'Архив'}
            </button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по названию…"
          className="flex-1 min-w-48 t-input text-sm" />
      </div>

      {isLoading && <div className="text-slate-400 py-8 text-center animate-pulse">Загрузка…</div>}
      {!isLoading && filtered.length === 0 && <div className="text-slate-400 py-8 text-center">Проектов нет</div>}

      <div className="space-y-2">
        {filtered.map((p: any) => (
          <div key={p.id} className="t-surface rounded-2xl p-4 flex items-center gap-4 ring-1 ring-white/8 hover:ring-white/15 transition-all">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white truncate">{p.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${p.status === 'active' ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30' : 'bg-white/5 text-slate-400 ring-white/10'}`}>
                  {p.status ?? 'active'}
                </span>
              </div>
              {p.description && <p className="text-xs text-slate-500 truncate mt-0.5">{p.description}</p>}
              {p.gitlab_url && (
                <a href={p.gitlab_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-400/70 hover:text-blue-300 truncate mt-0.5 inline-block">
                  {p.gitlab_url}
                </a>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/projects/${p.id}`}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Открыть проект">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
              </Link>
              <button onClick={() => handleDelete(p)} title="Удалить"
                className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
