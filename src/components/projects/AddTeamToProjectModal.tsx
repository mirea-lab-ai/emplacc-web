'use client';

import { useState, useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useAllTeams, useAddTeamToProject } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  existingTeamIds: string[];
};

export default function AddTeamToProjectModal({ open, onClose, projectId, existingTeamIds }: Props) {
  const [query, setQuery] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: allTeams, isLoading } = useAllTeams(hasCreds);
  const addTeamMutation = useAddTeamToProject();
  const toast = useToast();

  // Исключаем уже привязанные команды
  const availableTeams = useMemo(() => {
    if (!allTeams) return [];
    return allTeams.filter(team => !existingTeamIds.includes(team.id));
  }, [allTeams, existingTeamIds]);

  // Фильтруем команды по поисковому запросу
  const filteredTeams = useMemo(() => {
    if (!query.trim()) return availableTeams;
    
    const searchTerm = query.toLowerCase();
    return availableTeams.filter(team => 
      team.name?.toLowerCase().includes(searchTerm) ||
      team.description?.toLowerCase().includes(searchTerm)
    );
  }, [availableTeams, query]);

  const handleSubmit = async () => {
    if (!selectedTeam || addTeamMutation.isPending) return;
    
    try {
      await addTeamMutation.mutateAsync({ projectId, teamId: selectedTeam.id });
      onClose();
      setSelectedTeam(null);
      setQuery('');
    } catch (error) {
      console.error('Ошибка при добавлении команды:', error);
      toast.error('Ошибка при добавлении команды. Попробуйте еще раз.');
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-black border border-white/20 p-6">
        <h3 className="text-2xl font-semibold text-slate-100 mb-4">Добавить команду к проекту</h3>

        <div className="relative mb-4">
          <input
            autoFocus 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по названию команды..."
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

        <div className="mb-6">
          <div className="text-sm text-slate-300 mb-2">Доступные команды</div>
          <div className="max-h-64 overflow-auto rounded-xl bg-white/5 ring-1 ring-white/10">
            {isLoading ? (
              <div className="p-4 text-slate-400 text-center">Загрузка команд...</div>
            ) : filteredTeams.length === 0 ? (
              <div className="p-4 text-slate-400 text-center">
                {query ? 'Команды не найдены' : 'Нет доступных команд'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredTeams.map((team: any) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeam(team)}
                    className={`w-full text-left p-3 hover:bg-white/10 transition-colors ${
                      selectedTeam?.id === team.id ? 'bg-emerald-500/20 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="font-semibold text-white">{team.name}</div>
                    {team.description && (
                      <div className="text-slate-400 text-sm mt-1">{team.description}</div>
                    )}
                    <div className="text-xs text-slate-500 mt-1">
                      Участников: {team.members?.length || 0}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedTeam && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-sm text-emerald-400 mb-1">Выбранная команда:</div>
            <div className="font-semibold text-white">{selectedTeam.name}</div>
            {selectedTeam.description && (
              <div className="text-slate-300 text-sm mt-1">{selectedTeam.description}</div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-slate-300 hover:bg-white/10 transition-colors"
            disabled={addTeamMutation.isPending}
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedTeam || addTeamMutation.isPending}
            className="rounded-lg bg-gradient-to-br from-emerald-500 to-lime-400 px-5 py-2 font-semibold text-black hover:brightness-110 disabled:opacity-60 flex items-center gap-2"
          >
            {addTeamMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Добавляем...
              </>
            ) : (
              'Добавить команду'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
