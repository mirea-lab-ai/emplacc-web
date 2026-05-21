'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { useProjectTeams, useRemoveTeamFromProject } from '@/features/teams/hooks';
import { useIsClient } from '@/hooks/useIsClient';
import { isAuthed } from '@/lib/auth';
import AddTeamToProjectModal from './AddTeamToProjectModal';
import Link from 'next/link';

export default function ProjectsTeamsPanel({ projectId }: { projectId: string }) {
  const [openAdd, setOpenAdd] = useState(false);
  const isClient = useIsClient();
  const hasCreds = isClient && isAuthed();
  const { data: teams, isLoading, error } = useProjectTeams(projectId, hasCreds);
  const removeTeam = useRemoveTeamFromProject();
  const toast   = useToast();
  const confirm = useConfirm();

  async function handleRemove(teamId: string, teamName: string) {
    if (!(await confirm({ message: `Убрать команду «${teamName}» из проекта?`, danger: true, confirmLabel: 'Убрать' }))) return;
    try {
      await removeTeam.mutateAsync({ projectId, teamId });
      toast.success(`Команда «${teamName}» убрана`);
    } catch { toast.error('Не удалось убрать команду'); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="t-title text-white">Команды проекта</h2>
          {!isLoading && teams && (
            <p className="t-body mt-0.5">{teams.length} {teams.length === 1 ? 'команда' : teams.length < 5 ? 'команды' : 'команд'}</p>
          )}
        </div>
        <button onClick={() => setOpenAdd(true)} className="btn-primary text-sm py-2 px-4 shrink-0">
          + Добавить команду
        </button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="t-surface rounded-2xl p-5 ring-1 ring-white/8 space-y-3">
              <div className="skeleton h-5 w-40 rounded"/>
              <div className="flex gap-1.5">{Array.from({length:4}).map((_,j) => <div key={j} className="skeleton w-8 h-8 rounded-full"/>)}</div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="t-surface rounded-2xl p-5 text-red-400 ring-1 ring-red-500/20">Ошибка загрузки команд</div>}

      {!isLoading && !error && (!teams || teams.length === 0) && (
        <div className="t-surface rounded-2xl p-10 text-center ring-1 ring-white/8 space-y-2">
          <div className="text-4xl opacity-40">👥</div>
          <div className="t-title text-white opacity-50">Нет команд</div>
          <p className="t-body opacity-40">Добавьте команду чтобы назначить участников на задачи</p>
        </div>
      )}

      <div className="space-y-3">
        {(teams ?? []).map(team => {
          const memberCount = typeof team.members === 'number' ? team.members : 0;
          return (
            <div key={team.id}
              className="t-surface rounded-2xl p-5 ring-1 ring-white/8 hover:ring-white/15 transition-all group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <Link href={`/teams?team=${encodeURIComponent(team.id)}`}
                    className="font-semibold text-white hover:text-emerald-300 transition-colors block truncate">
                    {team.name}
                  </Link>
                  {team.description && (
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{team.description}</p>
                  )}
                </div>
                <button
                  onClick={() => void handleRemove(team.id, team.name)}
                  disabled={removeTeam.isPending}
                  className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-30 shrink-0"
                  title="Убрать из проекта">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">
                    {memberCount} {memberCount === 1 ? 'участник' : memberCount < 5 ? 'участника' : 'участников'}
                  </span>
                </div>
                <Link href={`/teams?team=${encodeURIComponent(team.id)}`}
                  className="text-xs text-emerald-400/60 hover:text-emerald-300 transition-colors">
                  Управлять →
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <AddTeamToProjectModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        projectId={projectId}
        existingTeamIds={teams?.map(t => t.id) ?? []}
      />
    </div>
  );
}
