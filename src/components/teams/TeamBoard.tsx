'use client';

import Panel from '@/components/ui/Panel';
import Avatar from '@/components/ui/Avatar';
import type { Member, Team } from './types';
import { useState } from 'react';
import AddMemberModal from './AddMemberModal';
import TeamProjects from './TeamProjects';
import { useRemoveTeamMember } from '@/features/teams/hooks';

export default function TeamBoard({
                                    team,
                                    onAddMember,
                                    onRemoveMember,
                                    onEditTeam,
                                  }: {
  team: Team;
  onAddMember: (m: Member) => void;
  onRemoveMember?: (memberId: string) => void;
  onEditTeam?: (team: Team) => void;
}) {
  const [openAdd, setOpenAdd] = useState(false);
  const removeMemberMutation = useRemoveTeamMember();

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMemberMutation.mutateAsync({ teamId: team.id, userId: memberId });
      if (onRemoveMember) {
        onRemoveMember(memberId);
      }
    } catch (error) {
      console.error('Ошибка при удалении участника:', error);
      alert('Ошибка при удалении участника. Попробуйте еще раз.');
    }
  };

  return (
    <div className="grid grid-cols-2 gap-6 min-h-[620px]">
      {/* Левый столбец - Состав команды */}
      <Panel className="p-6 min-h-0 h-full t-surface">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold">Состав команды</h3>
            <div className="text-sm text-slate-400">
              Тимлид: {team.lead?.id === 'no-lead'
                ? 'не назначен'
                : team.lead.role
                  ? `${team.lead.name} · ${team.lead.role}`
                  : team.lead.name}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onEditTeam && (
              <button
                onClick={() => onEditTeam(team)}
                className="rounded-xl px-4 py-2 ring-1 ring-white/10 text-slate-200 hover:bg-white/15"
              >
                Редактировать
              </button>
            )}
            <button
              onClick={() => setOpenAdd(true)}
              className="rounded-xl bg-gradient-to-br from-emerald-500 to-lime-400 px-4 py-2 text-black hover:brightness-110"
            >
              + Добавить сотрудника
            </button>
          </div>
        </div>

        {team.members.length ? (
          <div className="flex h-full min-h-0 flex-col">
            <ul className="space-y-3 pr-1 custom-scroll">
              {team.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl t-surface hover:bg-white/20 ring-1 ring-white/10 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full p-[2px] bg-gradient-to-br from-emerald-500 via-lime-400 to-cyan-400">
                      <Avatar name={m.name} url={m.avatarSrc} email={m.email} fallbackKey={m.id} size="lg" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold">{m.name}</div>
                      <div className="truncate text-slate-400 text-sm">{m.role}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    disabled={removeMemberMutation.isPending}
                    className="rounded-lg p-2 ring-1 ring-white/10 text-slate-300 hover:text-white hover:bg-[#ef4657]/25 hover:ring-[#ef4657]/40 transition disabled:opacity-50"
                    aria-label="Удалить"
                    title="Удалить"
                  >
                    {removeMemberMutation.isPending ? (
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl px-4 py-6 text-slate-400">
            В команде пока нет сотрудников
          </div>
        )}
      </Panel>

      {/* Правый столбец - Проекты команды */}
      <TeamProjects teamId={team.id} />

      <AddMemberModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        teamId={team.id}
        existingMemberIds={team.members.map(member => member.id)}
      />
    </div>
  );
}
