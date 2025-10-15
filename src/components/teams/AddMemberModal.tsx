'use client';

import { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import SelectedChip from '@/components/ReportWizard/SelectedChip';
import { useAllUsers } from '@/features/user/hooks';
import { useAddUsersToTeam } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed, getUserId } from '@/lib/auth';
import { Employee } from '@/lib/types';

export default function AddMemberModal({
                                         open,
                                         onClose,
                                         teamId,
                                         existingMemberIds = [],
                                       }: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  existingMemberIds?: string[];
}) {
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [query, setQuery] = useState('');
  
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: users, isLoading } = useAllUsers(1, 100, hasCreds);
  const addUsersMutation = useAddUsersToTeam();

  // Исключаем текущего пользователя, уже выбранных и существующих участников команды
  const availableUsers = useMemo(() => {
    if (!users) return [];
    const currentUserId = getUserId();
    const selectedIds = selectedMembers.map(s => s.id);
    
    return users
      .filter(user => 
        user.id !== currentUserId && 
        !selectedIds.includes(user.id) && 
        !existingMemberIds.includes(user.id)
      )
      .map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        avatarUrl: undefined,
        role: user.profession,
      }));
  }, [users, selectedMembers, existingMemberIds]);
  
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

  const addMember = (member: Employee) => {
    setSelectedMembers(prev => [...prev, member]);
  };

  const removeMember = (memberId: string) => {
    console.log('Removing member with ID:', memberId);
    setSelectedMembers(prev => {
      const newList = prev.filter(m => m.id !== memberId);
      console.log('Previous count:', prev.length, 'New count:', newList.length);
      return newList;
    });
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0 || addUsersMutation.isPending) return;
    
    try {
      // Добавляем всех выбранных пользователей одним запросом
      const userIds = selectedMembers.map(member => member.id);
      await addUsersMutation.mutateAsync({ teamId, userIds });
      onClose();
      setSelectedMembers([]);
      setQuery('');
    } catch (error) {
      console.error('Ошибка при добавлении участников:', error);
      alert('Ошибка при добавлении участников. Попробуйте еще раз.');
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-4xl rounded-2xl bg-black border border-white/20 p-6">
        <h3 className="text-2xl font-semibold text-slate-100 mb-4">Добавить участников в команду</h3>

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

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Выбранные */}
          <div className="md:col-span-2">
            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
              <div className="text-sm text-slate-300 mb-2">Выбранные</div>
              <div className="flex flex-col gap-2 max-h-80 overflow-auto">
                {selectedMembers.length === 0
                  ? <div className="text-slate-400 text-sm">Пока никого…</div>
                  : selectedMembers.map(emp => (
                      <SelectedChip key={emp.id} emp={emp} onRemove={() => removeMember(emp.id)} />
                    ))}
              </div>
            </div>
          </div>

          {/* Результаты */}
          <div className="md:col-span-3">
            <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
              <div className="text-sm text-slate-300 mb-2">Результаты</div>
              <div className="flex flex-col gap-2 max-h-80 overflow-auto">
                {isLoading
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

        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
            disabled={addUsersMutation.isPending}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedMembers.length === 0 || addUsersMutation.isPending}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
          >
            {addUsersMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Добавляем...
              </>
            ) : (
              `Добавить ${selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''}`
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
