'use client';

import { useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import {
  useAllTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  useAddUsersToTeam,
  useRemoveTeamMember,
} from '@/features/teams/hooks';
import { useAllUsers } from '@/features/user/hooks';
import type { UITeamFull, UITeamMember } from '@/features/teams/api';

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
}

function MemberChip({ member, onRemove }: { member: UITeamMember; onRemove?: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] ring-1 ring-white/8 px-2.5 py-1.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">
        {initials(member.name)}
      </span>
      <div className="min-w-0">
        <div className="text-sm text-white truncate">{member.name}</div>
        {(member.specialization || member.email) && (
          <div className="text-[11px] text-slate-500 truncate">{member.specialization || member.email}</div>
        )}
      </div>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={`Удалить ${member.name} из команды`}
          className="ml-1 shrink-0 text-slate-500 hover:text-red-300 hover:bg-red-500/10 rounded-lg px-1.5 py-0.5 transition-colors"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function AdminTeamsPage() {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const toast = useToast();
  const confirm = useConfirm();

  const { data: teams = [], isLoading } = useAllTeams(hasCreds);
  const { data: allUsers = [] } = useAllUsers(1, 200, hasCreds);

  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const addUsers = useAddUsersToTeam();
  const removeMember = useRemoveTeamMember();

  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  // create/edit modal
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UITeamFull | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // add-members modal
  const [membersFor, setMembersFor] = useState<UITeamFull | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [userSearch, setUserSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teams;
    return teams.filter(t => t.name.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q));
  }, [teams, search]);

  const totalMembers = useMemo(() => teams.reduce((acc, t) => acc + t.members.length, 0), [teams]);

  function openCreate() {
    setEditing(null); setName(''); setDescription(''); setFormOpen(true);
  }
  function openEdit(t: UITeamFull) {
    setEditing(t); setName(t.name); setDescription(t.description ?? ''); setFormOpen(true);
  }

  async function submitForm() {
    if (!name.trim()) return;
    try {
      if (editing) {
        await updateTeam.mutateAsync({ teamId: editing.id, payload: { name: name.trim(), description: description.trim() || undefined } });
        toast.success('Команда обновлена');
      } else {
        await createTeam.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
        toast.success('Команда создана');
      }
      setFormOpen(false);
    } catch {
      toast.error('Не удалось сохранить команду');
    }
  }

  async function handleDelete(t: UITeamFull) {
    if (!(await confirm({ title: 'Удалить команду', message: `Удалить команду «${t.name}»? Действие нельзя отменить.`, danger: true, confirmLabel: 'Удалить' }))) return;
    try {
      await deleteTeam.mutateAsync(t.id);
      toast.success('Команда удалена');
    } catch {
      toast.error('Не удалось удалить команду');
    }
  }

  async function handleRemoveMember(team: UITeamFull, member: UITeamMember) {
    if (!(await confirm({ message: `Убрать ${member.name} из «${team.name}»?`, danger: true, confirmLabel: 'Убрать' }))) return;
    try {
      await removeMember.mutateAsync({ teamId: team.id, userId: member.id });
      toast.success('Участник удалён');
    } catch {
      toast.error('Не удалось удалить участника');
    }
  }

  function openAddMembers(t: UITeamFull) {
    setMembersFor(t); setPicked(new Set()); setUserSearch('');
  }

  async function submitAddMembers() {
    if (!membersFor || picked.size === 0) return;
    try {
      await addUsers.mutateAsync({ teamId: membersFor.id, userIds: [...picked] });
      toast.success(`Добавлено участников: ${picked.size}`);
      setMembersFor(null);
    } catch {
      toast.error('Не удалось добавить участников');
    }
  }

  const candidateUsers = useMemo(() => {
    if (!membersFor) return [];
    const existing = new Set(membersFor.members.map(m => m.id));
    const q = userSearch.trim().toLowerCase();
    return allUsers
      .filter(u => !existing.has(u.id))
      .filter(u => {
        if (!q) return true;
        const full = `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase();
        return full.includes(q);
      });
  }, [membersFor, allUsers, userSearch]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-heading text-white">Команды</h1>
          <p className="t-body mt-1">Управление командами, участниками и составом</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-sm py-2 px-4">+ Создать команду</button>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="t-surface rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-emerald-400">{isLoading ? '—' : teams.length}</div>
          <div className="text-xs text-slate-500">Команд</div>
        </div>
        <div className="t-surface rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-blue-400">{isLoading ? '—' : totalMembers}</div>
          <div className="text-xs text-slate-500">Участников всего</div>
        </div>
        <div className="t-surface rounded-2xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">
            {isLoading || teams.length === 0 ? '—' : (totalMembers / teams.length).toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">В среднем на команду</div>
        </div>
      </div>

      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Поиск команды…"
        className="t-input max-w-sm"
      />

      {/* list */}
      {isLoading ? (
        <div className="t-body py-6">Загрузка…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
          <div className="text-3xl mb-2">👥</div>
          <div className="t-body">{search ? 'Ничего не найдено' : 'Пока нет команд'}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(team => {
            const isOpen = expanded === team.id;
            return (
              <div key={team.id} className="t-surface rounded-2xl ring-1 ring-white/8 overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  <button
                    onClick={() => setExpanded(isOpen ? null : team.id)}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left"
                  >
                    <span className={`text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300 font-bold">
                      {initials(team.name)}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{team.name}</div>
                      <div className="text-xs text-slate-500 truncate">
                        {team.members.length} участ. {team.description ? `· ${team.description}` : ''}
                      </div>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button onClick={() => openAddMembers(team)} className="rounded-xl px-3 py-1.5 text-xs text-emerald-300/80 hover:text-emerald-200 hover:bg-emerald-500/10 transition-colors">+ Участник</button>
                    <button onClick={() => openEdit(team)} className="rounded-xl px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Изм.</button>
                    <button onClick={() => handleDelete(team)} className="rounded-xl px-3 py-1.5 text-xs text-red-400/70 hover:text-red-300 hover:bg-red-500/10 transition-colors">Удалить</button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-white/8 p-4">
                    {team.members.length === 0 ? (
                      <div className="text-sm text-slate-500">В команде пока нет участников.</div>
                    ) : (
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {team.members.map(m => (
                          <MemberChip key={m.id} member={m} onRemove={() => handleRemoveMember(team, m)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* create/edit modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)}>
        <div className="t-surface-elevated rounded-2xl p-6 space-y-4 w-full">
          <h3 className="t-title text-white">{editing ? 'Редактировать команду' : 'Новая команда'}</h3>
          <div>
            <label className="t-label mb-1.5 block">Название</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Например: Backend" className="t-input"
              onKeyDown={e => e.key === 'Enter' && submitForm()} autoFocus />
          </div>
          <div>
            <label className="t-label mb-1.5 block">Описание</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Чем занимается команда" rows={3} className="t-input resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setFormOpen(false)} className="btn-ghost text-sm">Отмена</button>
            <button onClick={submitForm} disabled={!name.trim() || createTeam.isPending || updateTeam.isPending}
              className="btn-primary text-sm py-2 px-4 disabled:opacity-50">
              {editing ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </div>
      </Modal>

      {/* add members modal */}
      <Modal open={!!membersFor} onClose={() => setMembersFor(null)}>
        <div className="t-surface-elevated rounded-2xl p-6 space-y-4 w-full">
          <div>
            <h3 className="t-title text-white">Добавить участников</h3>
            <p className="t-caption mt-0.5">в команду «{membersFor?.name}»</p>
          </div>
          <input value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Поиск по имени или email…" className="t-input" autoFocus />
          <div className="max-h-72 overflow-y-auto space-y-1 custom-scroll">
            {candidateUsers.length === 0 ? (
              <div className="text-sm text-slate-500 py-4 text-center">Нет доступных пользователей</div>
            ) : candidateUsers.map(u => {
              const on = picked.has(u.id);
              return (
                <button key={u.id}
                  onClick={() => setPicked(prev => { const n = new Set(prev); n.has(u.id) ? n.delete(u.id) : n.add(u.id); return n; })}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${on ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30' : 'hover:bg-white/5'}`}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/8 text-xs font-bold text-slate-300">
                    {initials(`${u.firstName} ${u.lastName}`)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white truncate">{`${u.firstName} ${u.lastName}`.trim() || u.email}</div>
                    <div className="text-[11px] text-slate-500 truncate">{u.email}{u.profession ? ` · ${u.profession}` : ''}</div>
                  </div>
                  {on && <span className="text-emerald-300 text-sm">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="t-caption">Выбрано: {picked.size}</span>
            <div className="flex gap-2">
              <button onClick={() => setMembersFor(null)} className="btn-ghost text-sm">Отмена</button>
              <button onClick={submitAddMembers} disabled={picked.size === 0 || addUsers.isPending}
                className="btn-primary text-sm py-2 px-4 disabled:opacity-50">Добавить</button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
