'use client';

import Panel from '@/components/ui/Panel';
import { Team } from './types';

export default function TeamSidebar({
                                      teams,
                                      activeId,
                                      onSelect,
                                      onAddTeam,
                                    }: {
  teams: Team[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAddTeam: () => void;
}) {
  const hasTeams = teams.length > 0;

  return (
    <Panel className="p-4 w-[320px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-7rem)] overflow-auto custom-scroll space-y-3">
      <h2 className="text-lg font-semibold px-1">Мои команды</h2>

      {/* новая плитка «Добавить команду» */}
      <button
        onClick={onAddTeam}
        className={[
          'group w-full rounded-2xl border border-dashed border-white/15 bg-[#0f1422]/40',
          'hover:border-indigo-500/50 hover:bg-[#141c2f] transition-colors p-4 text-left',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#141c2f] ring-1 ring-white/10 group-hover:ring-indigo-400/40">
            <span className="text-lg leading-none">＋</span>
          </span>
          <div>
            <div className="font-medium">Создать команду</div>
            <div className="text-slate-400 text-sm">Добавить новую</div>
          </div>
        </div>
      </button>

      {!hasTeams ? (
        <div className="rounded-2xl bg-[#141c2f] ring-1 ring-white/10 px-4 py-3 text-slate-400">
          Вы не состоите ни в одной команде
        </div>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => {
            const active = t.id === activeId;
            return (
              <li key={t.id}>
                <button
                  onClick={() => onSelect(t.id)}
                  className={[
                    'relative w-full text-left rounded-2xl px-4 py-3 transition-colors',
                    'ring-1 ring-white/10 bg-[#141c2f] hover:bg-[#16213a]',
                    active ? 'ring-2 ring-indigo-500/40' : '',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
                      active
                        ? 'opacity-60 bg-gradient-to-r from-indigo-600 via-blue-600 to-fuchsia-600'
                        : 'opacity-0',
                    ].join(' ')}
                  />
                  <div className="relative z-[1]">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-slate-400 text-sm">Тимлид: {t.lead.name}</div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
