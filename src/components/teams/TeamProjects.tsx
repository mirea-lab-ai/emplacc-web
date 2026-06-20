'use client';

import Panel from '@/components/ui/Panel';
import { useTeamProjects } from '@/features/teams/hooks';
import { useState } from 'react';
import AddProjectModal from './AddProjectModal';
import Link from 'next/link';
import { formatDate } from '@/lib/date';

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
          <div className="text-app-2">Загрузка проектов...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-red-400">Ошибка загрузки проектов</div>
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex items-center justify-center h-32">
          <div className="text-app-2">У команды пока нет проектов</div>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project: any) => {
            const created = formatDate(project.created_at ?? project.createdAt);
            const updatedRaw = project.updated_at ?? project.updatedAt;
            const updated = updatedRaw ? formatDate(updatedRaw) : null;
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-xl bg-app-subtle border border-app p-4 transition-colors hover:bg-app-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
              >
                <div className="font-semibold text-app mb-2">{project.name ?? 'Без названия'}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-app-3">
                  {created && <span>Создан: {created}</span>}
                  {updated && <span>Обновлён: {updated}</span>}
                </div>
              </Link>
            );
          })}
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
