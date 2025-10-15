'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import type { Team } from './types';
import { useCreateTeam } from '@/features/teams/hooks';
import { convertUITeamToTeam } from '@/lib/teamUtils';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import SelectedChip from '@/components/ReportWizard/SelectedChip';
import { useAllUsers } from '@/features/user/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { Employee } from '@/lib/types';

export default function AddTeamModal({
                                       open,
                                       onClose,
                                       onCreate,
                                     }: {
  open: boolean;
  onClose: () => void;
  onCreate: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { mutate: createTeam, isPending, error } = useCreateTeam();

  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: users, isLoading: usersLoading } = useAllUsers(1, 100, hasCreds);

  // Исключаем текущего пользователя и уже выбранных
  const availableUsers = useMemo(() => {
    if (!users) return [];
    const currentUserId = getUserId();
    const selectedIds = selectedMembers.map(s => s.id);
    
    return users
      .filter(user => user.id !== currentUserId && !selectedIds.includes(user.id))
      .map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        avatarUrl: undefined,
        role: user.profession,
      }));
  }, [users, selectedMembers]);
  
  // Фильтруем по поисковому запросу
  const results = useMemo(() => {
    if (!query.trim()) return availableUsers;
    
    const searchTerm = query.toLowerCase();
    return availableUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm) ||
      user.role?.toLowerCase().includes(searchTerm)
    );
  }, [availableUsers, query]);

  useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setSelectedMembers([]);
      setQuery('');
      setShowUserSelector(false);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!name.trim() || isPending) return;
    
    createTeam(
      {
        name: name.trim(),
        description: description.trim() || undefined,
        user_ids: selectedMembers.map(member => member.id),
      },
      {
        onSuccess: (createdTeam) => {
          const team = convertUITeamToTeam(createdTeam);
          onCreate(team);
          onClose();
        },
        onError: (error) => {
          alert(`Ошибка создания команды: ${error.message}`);
        },
      }
    );
  };

  const addMember = (member: Employee) => {
    setSelectedMembers(prev => [...prev, member]);
  };

  const removeMember = (memberId: string) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl rounded-2xl bg-black">
        <div className="t-accent-grad/20 p-6 rounded-2xl">
          <h2 className="text-xl font-semibold mb-4">Создать команду</h2>

          <div className="grid gap-4 mb-4">
            <label className="grid gap-2">
              <span className="text-slate-200">Название команды <span className="text-red-400">*</span></span>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Например, Emplacc"
                required
              />
            </label>

            <label className="grid gap-2">
              <span className="text-slate-200">Описание (необязательно)</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-20 rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 px-4 py-3 ring-1 ring-white/10 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
                placeholder="Краткое описание команды"
              />
            </label>

            {/* Выбранные участники */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-200">Участники команды</span>
                <button
                  type="button"
                  onClick={() => setShowUserSelector(true)}
                  className="text-sm text-emerald-400 hover:text-emerald-300"
                >
                  + Добавить участников
                </button>
              </div>
              <div className="min-h-[60px] rounded-xl bg-white/5 border border-white/10 p-3">
                {selectedMembers.length === 0 ? (
                  <div className="text-slate-400 text-sm">Пока никого не добавлено</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map(member => (
                      <SelectedChip 
                        key={member.id} 
                        emp={member} 
                        onRemove={() => removeMember(member.id)} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30">
              <p className="text-red-400 text-sm">Ошибка: {error.message}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button 
              onClick={onClose} 
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-slate-300 hover:text-white disabled:opacity-50"
            >
              Отмена
            </button>
            <button
              onClick={submit}
              disabled={!name.trim() || isPending}
              className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Создаём...
                </>
              ) : (
                'Создать'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Модалка выбора пользователей */}
      {showUserSelector && (
        <Modal open={showUserSelector} onClose={() => setShowUserSelector(false)}>
          <div className="w-full max-w-2xl rounded-2xl bg-black border border-white/20 p-6">
            <h3 className="text-2xl font-semibold text-slate-100 mb-4">Выберите участников команды</h3>

            <div className="relative mb-4">
              <input
                autoFocus 
                value={query} 
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск по имени, email, роли…"
                className="w-full rounded-xl t-surface text-slate-100 placeholder:text-slate-400 px-4 py-3 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/60"
              />
              {query && (
                <button 
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" 
                  aria-label="Очистить"
                >
                  ×
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Выбранные */}
              <div className="md:col-span-1">
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-sm text-slate-300 mb-2">Выбранные</div>
                  <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                    {selectedMembers.length === 0
                      ? <div className="text-slate-400 text-sm">Пока никого…</div>
                      : selectedMembers.map(emp => (
                          <SelectedChip key={emp.id} emp={emp} onRemove={() => removeMember(emp.id)} />
                        ))}
                  </div>
                </div>
              </div>

              {/* Результаты */}
              <div className="md:col-span-2">
                <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                  <div className="text-sm text-slate-300 mb-2">Результаты</div>
                  <div className="flex flex-col gap-2 max-h-56 overflow-auto">
                    {usersLoading
                      ? <div className="text-slate-400 text-sm">Загрузка пользователей...</div>
                      : results.length === 0
                      ? <div className="text-slate-400 text-sm">Ничего не найдено…</div>
                      : results.map(emp => (
                          <button 
                            key={emp.id} 
                            onClick={() => addMember(emp)}
                            className="flex items-center gap-3 rounded-lg t-surface px-3 py-2 ring-1 ring-white/10 text-left"
                          >
                            <Avatar name={emp.name} url={emp.avatarUrl} />
                            <div className="min-w-0">
                              <div className="text-slate-100 text-sm truncate">{emp.name}</div>
                              <div className="text-slate-400 text-xs truncate">{emp.email || emp.role || 'Сотрудник'}</div>
                            </div>
                            <span className="ml-auto text-white text-xs">Добавить</span>
                          </button>
                        ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowUserSelector(false)} 
                className="rounded-xl px-4 py-2 bg-white/10 text-slate-100 ring-1 ring-white/10 hover:bg-white/15"
              >
                Подтвердить
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
