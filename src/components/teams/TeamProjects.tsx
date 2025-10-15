'use client';

import Panel from '@/components/ui/Panel';
import { useTeamProjects } from '@/features/teams/hooks';
import { useState } from 'react';
import AddProjectModal from './AddProjectModal';

type Props = {
  teamId: string;
};

export default function TeamProjects({ teamId }: Props) {
  const { data: projects, isLoading, error } = useTeamProjects(teamId);
  const [openAddProject, setOpenAddProject] = useState(false);

  return (
    <Panel className="p-6 h-full t-surface">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold">Проекты команды</h3>
        <button
          onClick={() => setOpenAddProject(true)}
          className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-black hover:brightness-110"
        >
          + Добавить проект
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-400">Загрузка проектов...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-red-400">Ошибка загрузки проектов</div>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-slate-400">У команды пока нет проектов</div>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project: any) => (
            <div
              key={project.id}
              className="rounded-xl bg-white/5 border border-white/10 p-4 hover:bg-white/10 transition-colors"
            >
              <div className="font-semibold text-white mb-2">{project.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  Создан: {new Date(project.created_at).toLocaleDateString('ru-RU')}
                </span>
                {project.updated_at && (
                  <span className="text-xs text-slate-500">
                    Обновлен: {new Date(project.updated_at).toLocaleDateString('ru-RU')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddProjectModal
        open={openAddProject}
        onClose={() => setOpenAddProject(false)}
        teamId={teamId}
      />
    </Panel>
  );
}
