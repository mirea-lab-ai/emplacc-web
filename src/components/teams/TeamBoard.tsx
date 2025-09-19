'use client';

import Panel from '@/components/ui/Panel';
import type { Member, Team } from './types';
import { useMemo, useState } from 'react';
import AddMemberModal from './AddMemberModal';

export default function TeamBoard({
                                    team,
                                    onAddMember,
                                    onRemoveMember,
                                  }: {
  team: Team;
  onAddMember: (m: Member) => void;
  onRemoveMember?: (memberId: string) => void;
}) {
  const [openAdd, setOpenAdd] = useState(false);
  const initials = useMemo(() => toInitials(team.lead.name), [team.lead.name]);

  return (
    // компактный блок тимлида + список сотрудников
    <div className="grid grid-rows-[auto_1fr] gap-6 min-h-[620px]">
      {/* Тимлид */}
      <Panel className="p-4 backdrop-blur-md bg-white/5 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="rounded-full p-[2px] bg-gradient-to-br from-[#FF7500] via-blue-500/80 to-[#14B8A6]">
            <div className="h-14 w-14 rounded-full overflow-hidden bg-[#0f1422] grid place-items-center text-lg font-semibold">
              {team.lead.avatarSrc ? (
                <img src={team.lead.avatarSrc} alt={team.lead.name} className="h-full w-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
          </div>
          <div>
            <div className="font-semibold">{team.lead.name}</div>
            <div className="text-slate-400 text-sm">Тимлид</div>
          </div>
        </div>
      </Panel>

      {/* Сотрудники */}
      <Panel className="p-6 min-h-0 h-full backdrop-blur-md bg-white/5 border border-white/10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h3 className="text-xl font-semibold">{team.name}</h3>
          <button
            onClick={() => setOpenAdd(true)}
            className="rounded-xl bg-[#2b3681] px-4 py-2 text-slate-200 hover:brightness-110"
          >
            + Добавить сотрудника
          </button>
        </div>

        {/* ВАЖНО: контейнер — колонка с flex-1, а грид без h-full,
            с items-start чтобы карточки НЕ растягивались по высоте */}
        {team.members.length ? (
          <div className="flex h-full min-h-0 flex-col">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-auto pr-1 custom-scroll items-start content-start">
              {team.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-xl backdrop-blur-sm bg-white/10 border border-white/20 hover:bg-white/20 ring-1 ring-white/10 px-4 py-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={m.name} src={m.avatarSrc} />
                    <div className="min-w-0">
                      <div className="truncate text-base md:text-lg font-semibold">{m.name}</div>
                      <div className="truncate text-slate-400 text-sm md:text-base">{m.role}</div>
                    </div>
                  </div>

                  {onRemoveMember && (
                    <button
                      onClick={() => onRemoveMember(m.id)}
                      className="rounded-lg p-2 ring-1 ring-white/10 text-slate-300 hover:text-white hover:bg-[#ef4657]/25 hover:ring-[#ef4657]/40 transition"
                      aria-label="Удалить"
                      title="Удалить"
                    >
                      {/* иконка мусорки */}
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
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="grid h-full place-items-center rounded-xl bg-black/20 px-4 py-6 text-slate-400 ring-1 ring-white/10">
            В команде пока нет сотрудников
          </div>
        )}
      </Panel>

      <AddMemberModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        onCreate={(m) => onAddMember(m)}
      />
    </div>
  );
}

/* --- helpers --- */

function Avatar({ name, src }: { name: string; src?: string }) {
  const initials = useMemo(() => toInitials(name), [name]);
  return (
    <div className="rounded-full p-[2px] bg-gradient-to-br from-indigo-500/80 via-blue-500/80 to-fuchsia-500/80">
      <div className="h-10 w-10 md:h-11 md:w-11 rounded-full grid place-items-center bg-[#0f1422] text-sm md:text-base font-semibold text-white overflow-hidden">
        {src ? <img src={src} alt={name} className="h-full w-full object-cover rounded-full" /> : initials}
      </div>
    </div>
  );
}

function toInitials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}
