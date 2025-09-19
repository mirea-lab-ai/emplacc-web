'use client';

import { useEffect, useState } from 'react';
import Panel from '@/components/ui/Panel';
import ProjectTeamsSimple, { SimpleGroup } from '@/components/projects/ProjectTeamsSimple';
import AddTeamModal from '@/components/teams/AddTeamModal';
import type { Team } from '@/components/teams/types';

const demoGroups: SimpleGroup[] = [
  {
    id: 'g-fe',
    name: 'Фронтендеры',
    members: [
      { id: 'u1', name: 'Мария Иванова', role: 'React Developer' },
      { id: 'u2', name: 'Илья Петров',   role: 'QA' },
    ],
  },
  {
    id: 'g-be',
    name: 'Бэкендеры',
    members: [
      { id: 'u3', name: 'Дмитрий Соколов', role: 'Go Developer' },
    ],
  },
];

export default function ProjectsTeamsPanel() {
  const [groups, setGroups] = useState<SimpleGroup[]>([]);
  const [openCreateTeam, setOpenCreateTeam] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('proj_groups');
      const parsed = raw ? (JSON.parse(raw) as SimpleGroup[]) : [];
      setGroups(Array.isArray(parsed) && parsed.length ? parsed : demoGroups);
    } catch {
      setGroups(demoGroups);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('proj_groups', JSON.stringify(groups));
  }, [groups]);

  const addTeamGroup = (team: Team) => {
    const g: SimpleGroup = {
      id: team.id,
      name: team.name,
      members: (team.members ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        role: m.role,
      })),
    };
    setGroups((prev) => [g, ...prev]);
  };

  return (
    <>
      <Panel className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Команды проекта</h2>
          <button
            onClick={() => setOpenCreateTeam(true)}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-slate-200 hover:brightness-110"
          >
            + Добавить команду
          </button>
        </div>

        <ProjectTeamsSimple groups={groups} />
      </Panel>

      <AddTeamModal
        open={openCreateTeam}
        onClose={() => setOpenCreateTeam(false)}
        onCreate={(team) => {
          addTeamGroup(team);
          setOpenCreateTeam(false);
        }}
      />
    </>
  );
}
