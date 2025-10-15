'use client';

import Panel from '@/components/ui/Panel';
import { useProjectTeams, useRemoveTeamFromProject } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { useState } from 'react';
import AddTeamToProjectModal from './AddTeamToProjectModal';
import TrashIcon from '@/components/ui/icons/TrashIcon';

type Props = {
  projectId: string;
};

export default function ProjectsTeamsPanel({ projectId }: Props) {
  const [openAddTeam, setOpenAddTeam] = useState(false);
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: teams, isLoading, error } = useProjectTeams(projectId, hasCreds);
  const removeTeamMutation = useRemoveTeamFromProject();

  const handleRemoveTeam = async (teamId: string) => {
    try {
      await removeTeamMutation.mutateAsync({ projectId, teamId });
    } catch (error) {
      console.error('Ошибка при удалении команды:', error);
      alert('Ошибка при удалении команды. Попробуйте еще раз.');
    }
  };

  return (
    <Panel className="p-6 t-surface">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Команды проекта</h2>
        <button
          onClick={() => setOpenAddTeam(true)}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-black hover:brightness-110"
        >
          + Добавить команду
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-400">Загрузка команд...</div>
      ) : error ? (
        <div className="text-red-400">Ошибка загрузки команд</div>
      ) : !teams || teams.length === 0 ? (
        <div className="text-slate-400">На данный проект пока не назначена ни одна команда</div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="group relative rounded-xl border border-white/20 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between pr-8">
                <div>
                  <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-slate-400 mt-1">{team.description}</p>
                  )}
                </div>
                {team.members !== undefined && (
                  <div className="text-sm text-slate-400">
                    {team.members} {team.members === 1 ? 'участник' : 'участников'}
                  </div>
                )}
              </div>
              
              {/* Иконка мусорки при наведении */}
              <button
                onClick={() => handleRemoveTeam(team.id)}
                disabled={removeTeamMutation.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-50"
                title="Удалить команду из проекта"
              >
                {removeTeamMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <TrashIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      <AddTeamToProjectModal
        open={openAddTeam}
        onClose={() => setOpenAddTeam(false)}
        projectId={projectId}
        existingTeamIds={teams?.map(team => team.id) || []}
      />
    </Panel>
  );
}
