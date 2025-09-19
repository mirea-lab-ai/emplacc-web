'use client';

import Panel from '@/components/ui/Panel';
import TeamSidebar from '@/components/teams/TeamSidebar';
import TeamBoard from '@/components/teams/TeamBoard';
import AddTeamModal from '@/components/teams/AddTeamModal';
import type { Member, Team } from '@/components/teams/types';
import { useEffect, useMemo, useState } from 'react';

const demoTeams: Team[] = [
  {
    id: 'tm1',
    name: 'Emplacc',
    lead: { id: 'l1', name: 'Алексей Смирнов' },
    members: [
      { id: 'u1', name: 'Мария Иванова', role: 'React Developer' },
      { id: 'u2', name: 'Илья Петров', role: 'QA' },
      { id: 'u3', name: 'Дмитрий Соколов', role: 'Go Developer' },
    ],
  },
  {
    id: 'tm2',
    name: 'Website',
    lead: { id: 'l2', name: 'Наталья Ким' },
    members: [],
  },
];

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [openCreate, setOpenCreate] = useState(false);

  // demo/персист
  useEffect(() => {
    const raw = localStorage.getItem('teams_data_flat');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Team[];
        if (Array.isArray(parsed) && parsed.length) setTeams(parsed);
        else setTeams(demoTeams);
      } catch {
        setTeams(demoTeams);
      }
    } else {
      setTeams(demoTeams);
    }
  }, []);
  useEffect(() => {
    localStorage.setItem('teams_data_flat', JSON.stringify(teams));
  }, [teams]);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeId),
    [teams, activeId]
  );

  const addMember = (m: Member) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, members: [...t.members, m] } : t
      )
    );
  };

  const removeMember = (memberId: string) => {
    setTeams((prev) =>
      prev.map((t) =>
        t.id === activeId
          ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
          : t
      )
    );
  };

  const addTeam = (team: Team) => {
    setTeams((prev) => [team, ...prev]);
    setActiveId(team.id);
  };

  return (
    <main className="min-h-screen bg-emerald-950 text-white">
      <div className="mx-auto p-6 space-y-6">

        <div className="flex gap-6 ">
          {/* левая колонка */}
          <TeamSidebar
            teams={teams}
            activeId={activeId}
            onSelect={setActiveId}
            onAddTeam={() => setOpenCreate(true)}
          />

          {/* правая область */}
          <div className="flex-1 min-w-0">
            {!teams.length ? (
              <Panel className="grid place-items-center min-h-[520px] backdrop-blur-md bg-white/5 border border-white/10">
                <div className="text-slate-400">
                  Вы не состоите ни в одной команде
                </div>
              </Panel>
            ) : !activeTeam ? (
              <Panel className="grid place-items-center min-h-[520px] backdrop-blur-md bg-white/5 border border-white/10">
                <div className="text-slate-400">Выберите команду слева</div>
              </Panel>
            ) : (
              <TeamBoard
                team={activeTeam}
                onAddMember={addMember}
                onRemoveMember={removeMember}
              />
            )}
          </div>
        </div>
      </div>

      <AddTeamModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreate={addTeam}
      />
    </main>
  );
}
