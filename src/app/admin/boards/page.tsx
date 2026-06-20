'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useAllProjects } from '@/features/teams/hooks';
import { useProjectBoards, useCreateBoard, useDeleteBoard } from '@/features/boards/hooks';
import { useBoardStatus, useCreateStatus, useDeleteStatus } from '@/features/status/hooks';

const STATUS_COLORS = ['#10b981', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#64748b'];

function projName(p: any): string {
  return p?.name ?? p?.title ?? 'Без названия';
}

export default function AdminBoardsPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: projects = [], isLoading: projectsLoading } = useAllProjects(hasCreds);

  const [projectId, setProjectId] = useState<string | null>(null);
  const [boardId, setBoardId] = useState<string | null>(null);
  const [projSearch, setProjSearch] = useState('');

  const { data: boards = [], isLoading: boardsLoading } = useProjectBoards(projectId, hasCreds && !!projectId);
  const { data: boardStatus, isLoading: statusLoading } = useBoardStatus(boardId, hasCreds && !!boardId);

  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  const createStatus = useCreateStatus();
  const deleteStatus = useDeleteStatus();

  const [newBoard, setNewBoard] = useState('');
  const [newStatusName, setNewStatusName] = useState('');
  const [newStatusColor, setNewStatusColor] = useState(STATUS_COLORS[0]);
  const [newStatusOpen, setNewStatusOpen] = useState(true);

  const filteredProjects = useMemo(() => {
    const q = projSearch.trim().toLowerCase();
    const list = q ? projects.filter((p: any) => projName(p).toLowerCase().includes(q)) : projects;
    return list.slice(0, 100);
  }, [projects, projSearch]);

  const selectedProject = projects.find((p: any) => String(p.id) === projectId);
  const statuses = boardStatus?.statuses ?? [];

  async function handleCreateBoard() {
    if (!newBoard.trim() || !projectId) return;
    try {
      await createBoard.mutateAsync({ name: newBoard.trim(), project_id: projectId });
      toast.success('Доска создана');
      setNewBoard('');
    } catch { toast.error('Не удалось создать доску'); }
  }

  async function handleDeleteBoard(id: string, name: string) {
    if (!projectId) return;
    if (!(await confirm({ title: 'Удалить доску', message: `Удалить доску «${name}» со всеми статусами и задачами?`, danger: true, confirmLabel: 'Удалить' }))) return;
    try {
      await deleteBoard.mutateAsync({ boardId: id, projectId });
      if (boardId === id) setBoardId(null);
      toast.success('Доска удалена');
    } catch { toast.error('Не удалось удалить доску'); }
  }

  async function handleCreateStatus() {
    if (!newStatusName.trim() || !boardId) return;
    try {
      await createStatus.mutateAsync({
        name: newStatusName.trim(),
        color: newStatusColor,
        board_id: boardId,
        order: statuses.length,
        is_open: newStatusOpen,
      });
      toast.success('Статус создан');
      setNewStatusName('');
    } catch { toast.error('Не удалось создать статус'); }
  }

  async function handleDeleteStatus(id: string, name: string) {
    if (!(await confirm({ title: 'Удалить статус', message: `Удалить статус «${name}»? Задачи в нём останутся без колонки.`, danger: true, confirmLabel: 'Удалить' }))) return;
    try {
      await deleteStatus.mutateAsync(id);
      toast.success('Статус удалён');
    } catch { toast.error('Не удалось удалить статус'); }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="t-heading text-white">Доски и статусы</h1>
        <p className="t-body mt-1">Управление досками проектов и их колонками-статусами</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:max-h-[calc(100vh-13rem)]">
        {/* Projects */}
        <div className="t-surface rounded-2xl p-3 flex flex-col min-h-0">
          <div className="t-label px-1 mb-2">Проекты</div>
          <input value={projSearch} onChange={e => setProjSearch(e.target.value)} placeholder="Поиск проекта…" className="t-input mb-2" />
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scroll">
            {projectsLoading ? <div className="t-body px-1 py-2">Загрузка…</div>
              : filteredProjects.length === 0 ? <div className="t-caption px-1 py-2">Нет проектов</div>
              : filteredProjects.map((p: any) => {
                const id = String(p.id);
                return (
                  <button key={id} onClick={() => { setProjectId(id); setBoardId(null); }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-sm transition-colors ${projectId === id ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30 text-white' : 'text-white/80 hover:bg-white/5'}`}>
                    {projName(p)}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Boards */}
        <div className="t-surface rounded-2xl p-3 flex flex-col min-h-0">
          <div className="t-label px-1 mb-2">Доски {selectedProject ? `· ${projName(selectedProject)}` : ''}</div>
          {!projectId ? (
            <div className="t-caption px-1 py-4">← Выберите проект</div>
          ) : (
            <>
              <div className="flex gap-2 mb-2">
                <input value={newBoard} onChange={e => setNewBoard(e.target.value)} placeholder="Новая доска…" className="t-input"
                  onKeyDown={e => e.key === 'Enter' && handleCreateBoard()} />
                <button onClick={handleCreateBoard} disabled={!newBoard.trim() || createBoard.isPending}
                  className="btn-primary text-sm px-3 shrink-0 disabled:opacity-50">+</button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scroll">
                {boardsLoading ? <div className="t-body px-1 py-2">Загрузка…</div>
                  : boards.length === 0 ? <div className="t-caption px-1 py-2">Нет досок</div>
                  : boards.map(b => (
                    <div key={b.id} className={`flex items-center gap-1 rounded-xl pl-3 pr-1 py-1.5 transition-colors ${boardId === b.id ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : 'hover:bg-white/5'}`}>
                      <button onClick={() => setBoardId(b.id)} className="flex-1 min-w-0 text-left text-sm text-white/90 truncate">{b.name}</button>
                      <button onClick={() => handleDeleteBoard(b.id, b.name)} aria-label="Удалить доску"
                        className="shrink-0 text-slate-500 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-2 py-0.5 transition-colors">✕</button>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Statuses */}
        <div className="t-surface rounded-2xl p-3 flex flex-col min-h-0">
          <div className="t-label px-1 mb-2">Статусы (колонки)</div>
          {!boardId ? (
            <div className="t-caption px-1 py-4">← Выберите доску</div>
          ) : (
            <>
              <div className="space-y-2 mb-2">
                <div className="flex gap-2">
                  <input value={newStatusName} onChange={e => setNewStatusName(e.target.value)} placeholder="Новый статус…" className="t-input"
                    onKeyDown={e => e.key === 'Enter' && handleCreateStatus()} />
                  <button onClick={handleCreateStatus} disabled={!newStatusName.trim() || createStatus.isPending}
                    className="btn-primary text-sm px-3 shrink-0 disabled:opacity-50">+</button>
                </div>
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-1.5">
                    {STATUS_COLORS.map(c => (
                      <button key={c} onClick={() => setNewStatusColor(c)} aria-label={`Цвет ${c}`}
                        className={`h-5 w-5 rounded-full transition-transform ${newStatusColor === c ? 'ring-2 ring-white scale-110' : 'ring-1 ring-white/20'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                  <label className="flex items-center gap-1.5 t-caption cursor-pointer">
                    <input type="checkbox" checked={newStatusOpen} onChange={e => setNewStatusOpen(e.target.checked)} className="accent-emerald-500" />
                    открытый
                  </label>
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1 custom-scroll">
                {statusLoading ? <div className="t-body px-1 py-2">Загрузка…</div>
                  : statuses.length === 0 ? <div className="t-caption px-1 py-2">Нет статусов</div>
                  : statuses.map(s => (
                    <div key={s.id} className="flex items-center gap-2 rounded-xl pl-3 pr-1 py-1.5 hover:bg-white/5 transition-colors">
                      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color || '#64748b' }} />
                      <span className="flex-1 min-w-0 text-sm text-white/90 truncate">{s.name}</span>
                      {s.isOpen === false && <span className="shrink-0 rounded-md bg-white/8 text-slate-400 text-[10px] px-1.5 py-0.5">closed</span>}
                      {typeof s.tasks?.length === 'number' && s.tasks.length > 0 && (
                        <span className="shrink-0 t-caption">{s.tasks.length}</span>
                      )}
                      <button onClick={() => handleDeleteStatus(s.id, s.name)} aria-label="Удалить статус"
                        className="shrink-0 text-slate-500 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-2 py-0.5 transition-colors">✕</button>
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
