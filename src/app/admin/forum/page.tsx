'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useAllProblems, useDeleteProblem } from '@/features/problems/hooks';
import { useForumMessagesByProblem, useDeleteForumMessage } from '@/features/forum-messages/hooks';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import Link from 'next/link';

export default function AdminForumPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const qc = useQueryClient();
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const [search, setSearch] = useState('');
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);

  const { data: problems = [], isLoading } = useAllProblems(1, 200, hasCreds);
  const { mutate: deleteProblemMut } = useDeleteProblem();
  const { data: messages = [] } = useForumMessagesByProblem(activeProblemId, 1, 100, hasCreds && !!activeProblemId);
  const { mutate: deleteMessageMut } = useDeleteForumMessage(activeProblemId);

  const filtered = useMemo(() => {
    if (!search.trim()) return problems;
    const q = search.toLowerCase();
    return problems.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
  }, [problems, search]);

  async function handleDeleteProblem(p: { id: string; name: string }) {
    if (!await confirm({ title: 'Удалить тему?', message: `«${p.name}» будет удалена вместе со всеми сообщениями.`, danger: true, confirmLabel: 'Удалить' })) return;
    deleteProblemMut(p.id, {
      onSuccess: () => { toast.success(`Тема «${p.name}» удалена`); if (activeProblemId === p.id) setActiveProblemId(null); },
      onError:   () => toast.error('Не удалось удалить тему'),
    });
  }

  async function handleDeleteMessage(id: string) {
    if (!await confirm({ message: 'Удалить это сообщение?', danger: true, confirmLabel: 'Удалить' })) return;
    deleteMessageMut(id, {
      onSuccess: () => toast.success('Сообщение удалено'),
      onError:   () => toast.error('Не удалось удалить сообщение'),
    });
  }

  const activeProblem = problems.find(p => p.id === activeProblemId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="t-heading text-white">Форум</h1>
        <p className="t-body mt-0.5">{problems.length} тем · модерация сообщений</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
        {/* Topics list */}
        <div className="space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск тем…" className="t-input text-sm w-full" />

          {isLoading && <div className="text-slate-400 text-center py-8 animate-pulse">Загрузка…</div>}
          <div className="space-y-2">
            {filtered.map(p => (
              <div key={p.id}
                className={`t-surface rounded-2xl p-4 flex items-center gap-3 ring-1 cursor-pointer transition-all ${activeProblemId === p.id ? 'ring-emerald-500/40 bg-emerald-500/5' : 'ring-white/8 hover:ring-white/15'}`}
                onClick={() => setActiveProblemId(activeProblemId === p.id ? null : p.id)}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">{p.name}</div>
                  {p.description && <p className="text-xs text-slate-500 truncate mt-0.5">{p.description}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/forum?problem=${p.id}`} onClick={e => e.stopPropagation()}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Открыть на форуме">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </Link>
                  <button onClick={e => { e.stopPropagation(); void handleDeleteProblem(p); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Удалить тему">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Messages panel */}
        <div className="t-surface rounded-2xl p-4 space-y-3 ring-1 ring-white/8 min-h-[400px] max-h-[70vh] flex flex-col">
          {!activeProblem ? (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Выберите тему для просмотра сообщений
            </div>
          ) : (
            <>
              <div className="font-semibold text-white shrink-0">{activeProblem.name}</div>
              <div className="flex-1 overflow-y-auto space-y-2">
                {messages.length === 0 && <p className="text-slate-500 text-sm text-center py-8">Сообщений нет</p>}
                {messages.map(m => (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/5 group transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-emerald-300">{m.authorName || m.authorId}</div>
                      <p className="text-sm text-slate-300 mt-0.5 line-clamp-3 break-words">{m.content}</p>
                      {m.createdAt && <div className="text-[10px] text-slate-600 mt-1">{new Date(m.createdAt).toLocaleString('ru-RU')}</div>}
                    </div>
                    <button onClick={() => void handleDeleteMessage(m.id)}
                      className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all shrink-0" title="Удалить">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
