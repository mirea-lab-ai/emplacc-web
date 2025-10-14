'use client';

import Panel from '@/components/ui/Panel';
import TeamSidebar from '@/components/teams/TeamSidebar';
import TeamBoard from '@/components/teams/TeamBoard';
import AddTeamModal from '@/components/teams/AddTeamModal';
import DeleteTeamModal from '@/components/teams/DeleteTeamModal';
import type { Member, Team } from '@/components/teams/types';
import EditTeamModal from '@/components/teams/EditTeamModal';
import { useAllTeams, useDeleteTeam } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import { convertUITeamToTeam } from '@/lib/teamUtils';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

export default function TeamsPage() {
  return (
    <Suspense fallback={<TeamsPageFallback />}
    >
      <TeamsPageContent />
    </Suspense>
  );
}

function TeamsPageContent() {
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [openCreate, setOpenCreate] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; teamId: string; teamName: string }>({
    open: false,
    teamId: '',
    teamName: '',
  });
  const [editTeam, setEditTeam] = useState<Team | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  
  // Загружаем команды из API
  const { data: apiTeams, isLoading, error } = useAllTeams(hasCreds);
  const deleteTeamMutation = useDeleteTeam();
  
  // Преобразуем данные API в формат компонента
  const teams: Team[] = useMemo(() => {
    if (!apiTeams) return [];
    return apiTeams.map(convertUITeamToTeam);
  }, [apiTeams]);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeId),
    [teams, activeId]
  );

  // Устанавливаем активную команду, синхронизуя с query параметром
  useEffect(() => {
    if (!teams.length) {
      if (activeId) {
        setActiveId(undefined);
      }
      return;
    }

    if (activeId && !teams.some((t) => t.id === activeId)) {
      setActiveId(teams[0].id);
      return;
    }

    const teamFromUrl = searchParams.get('team');
    if (teamFromUrl && teams.some((t) => t.id === teamFromUrl)) {
      if (teamFromUrl !== activeId) {
        setActiveId(teamFromUrl);
      }
      return;
    }

    if (!activeId) {
      setActiveId(teams[0].id);
    }
  }, [teams, activeId, searchParams]);

  useEffect(() => {
    const current = searchParams.get('team');
    const params = new URLSearchParams(searchParams.toString());

    if (!activeId) {
      if (!current) return;
      params.delete('team');
    } else {
      if (current === activeId) return;
      params.set('team', activeId);
    }

    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [activeId, router, searchParams, pathname]);

  // Функции для работы с участниками (пока заглушки, так как API для этого нет)
  const addMember = (m: Member) => {
    // TODO: Реализовать добавление участника через API
    console.log('Add member:', m);
  };

  const removeMember = (memberId: string) => {
    // TODO: Реализовать удаление участника через API
    console.log('Remove member:', memberId);
  };

  const addTeam = (team: Team) => {
    // Команда уже добавлена через API, просто выбираем её
    setActiveId(team.id);
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    setDeleteModal({ open: true, teamId, teamName });
  };

  const confirmDeleteTeam = async () => {
    try {
      await deleteTeamMutation.mutateAsync(deleteModal.teamId);
      // Если удаляемая команда была активной, выбираем первую доступную
      if (activeId === deleteModal.teamId) {
        const remainingTeams = teams.filter(t => t.id !== deleteModal.teamId);
        setActiveId(remainingTeams.length > 0 ? remainingTeams[0].id : undefined);
      }
      setDeleteModal({ open: false, teamId: '', teamName: '' });
    } catch (error) {
      console.error('Ошибка при удалении команды:', error);
      alert('Ошибка при удалении команды. Попробуйте еще раз.');
    }
  };

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto p-6 space-y-6">

        <div className="flex gap-6 ">
          {/* левая колонка */}
              <TeamSidebar
                teams={teams}
                activeId={activeId}
                onSelect={setActiveId}
                onAddTeam={() => setOpenCreate(true)}
                onDeleteTeam={handleDeleteTeam}
              />

          {/* правая область */}
          <div className="flex-1 min-w-0">
            {isLoading ? (
              <Panel className="grid place-items-center min-h-[520px] t-surface">
                <div className="text-slate-400">Загрузка команд...</div>
              </Panel>
            ) : error ? (
              <Panel className="grid place-items-center min-h-[520px] t-surface">
                <div className="text-red-400">Ошибка загрузки команд</div>
              </Panel>
            ) : !teams.length ? (
              <Panel className="grid place-items-center min-h-[520px] t-surface">
                <div className="text-slate-400">
                  Вы не состоите ни в одной команде
                </div>
              </Panel>
            ) : !activeTeam ? (
              <Panel className="grid place-items-center min-h-[520px] t-surface">
                <div className="text-slate-400">Выберите команду слева</div>
              </Panel>
            ) : (
              <TeamBoard
                team={activeTeam}
                onAddMember={addMember}
                onRemoveMember={removeMember}
                onEditTeam={(team) => setEditTeam(team)}
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
          
          <DeleteTeamModal
            open={deleteModal.open}
            onClose={() => setDeleteModal({ open: false, teamId: '', teamName: '' })}
            onConfirm={confirmDeleteTeam}
            teamName={deleteModal.teamName}
            isDeleting={deleteTeamMutation.isPending}
          />

          <EditTeamModal
            open={!!editTeam}
            team={editTeam}
            onClose={() => setEditTeam(null)}
          />
        </main>
      );
    }

function TeamsPageFallback() {
  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto p-6">
        <Panel className="p-6 t-surface">Загрузка команд...</Panel>
      </div>
    </main>
  );
}
