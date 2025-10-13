'use client';

import Panel from '@/components/ui/Panel';
import { useProjectTeams } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';

type Props = {
  projectId: string;
};

export default function ProjectsTeamsPanel({ projectId }: Props) {
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: teams, isLoading, error } = useProjectTeams(projectId, hasCreds);

  return (
    <Panel className="p-6 t-surface">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Команды проекта</h2>
      </div>

      {isLoading ? (
        <div className="text-slate-400">Загрузка команд...</div>
      ) : error ? (
        <div className="text-red-400">Ошибка загрузки команд</div>
      ) : !teams || teams.length === 0 ? (
        <div className="text-slate-400">Нет команд для этого проекта</div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => (
            <div
              key={team.id}
              className="rounded-xl border border-white/20 bg-white/5 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between">
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
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
