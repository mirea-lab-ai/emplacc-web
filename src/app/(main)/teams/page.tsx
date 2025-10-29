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

  const teamFromUrl = searchParams.get('team');

  const activeTeamId = useMemo(() => {
    if (!teams.length) return undefined;
    if (teamFromUrl && teams.some((t) => t.id === teamFromUrl)) {
      return teamFromUrl;
    }
    return teams[0]?.id;
  }, [teamFromUrl, teams]);

  const activeTeam = useMemo(
    () => teams.find((t) => t.id === activeTeamId),
    [teams, activeTeamId]
  );

  // Если параметр не задан или указывает на удаленную команду — ставим первый доступный
  useEffect(() => {
    if (!teams.length) {
      return;
    }

    if (teamFromUrl && teams.some((t) => t.id === teamFromUrl)) {
      return;
    }

    const fallbackId = teams[0]?.id;
    if (!fallbackId) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set('team', fallbackId);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  }, [teams, teamFromUrl, searchParams, router, pathname]);

  const selectTeam = (teamId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('team', teamId);
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  const clearTeamSelection = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('team');
    const queryString = params.toString();
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

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
    selectTeam(team.id);
  };

  const handleDeleteTeam = (teamId: string, teamName: string) => {
    setDeleteModal({ open: true, teamId, teamName });
  };

  const confirmDeleteTeam = async () => {
    try {
      await deleteTeamMutation.mutateAsync(deleteModal.teamId);
      // Если удаляемая команда была активной, выбираем первую доступную
      if (activeTeamId === deleteModal.teamId) {
        const remainingTeams = teams.filter(t => t.id !== deleteModal.teamId);
        if (remainingTeams.length > 0) {
          selectTeam(remainingTeams[0].id);
        } else {
          clearTeamSelection();
        }
      }
      setDeleteModal({ open: false, teamId: '', teamName: '' });
    } catch (error) {
      console.error('Ошибка при удалении команды:', error);
      alert('Ошибка при удалении команды. Попробуйте еще раз.');
    }
  };

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* левая колонка */}
              <TeamSidebar
                teams={teams}
                activeId={activeTeamId}
                onSelect={selectTeam}
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
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <Panel className="p-6 t-surface">Загрузка команд...</Panel>
      </div>
    </main>
  );
}
