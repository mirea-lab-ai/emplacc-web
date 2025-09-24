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
    <Panel className="p-4 w-[320px] shrink-0 sticky top-6 self-start max-h-[calc(100vh-7rem)] overflow-auto custom-scroll space-y-3 t-surface">
      <h2 className="text-lg font-semibold px-1">Мои команды</h2>

      {/* новая плитка «Добавить команду» */}
      <button
        onClick={onAddTeam}
        className={[
          'group w-full rounded-2xl border-white/15 border border-dashed t-accent-grad/20',
          ' hover:brightness-110 p-4 text-left',
        ].join(' ')}
      >
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl ring-1 ring-white/10 group-hover:ring-emerald-400/40">
            <span className="text-lg leading-none">＋</span>
          </span>
          <div>
            <div className="font-medium">Создать команду</div>
          </div>
        </div>
      </button>

      {!hasTeams ? (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 ring-1 ring-white/10 px-4 py-3 text-slate-400">
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
                    'ring-1 ring-white/10 t-surface',
                    active ? 'ring-2 ring-emerald-500/40' : '',
                  ].join(' ')}
                >
                  <div
                    className={[
                      'pointer-events-none absolute inset-0 rounded-2xl transition-opacity',
                      active
                        ? 'bg-gradient-to-br from-emerald-500 to-lime-400'
                        : 'opacity-0',
                    ].join(' ')}
                  />
                  <div className="relative z-[1]">
                    <div className={['font-semibold',
                                     active ? 'text-black' : 'text-white',].join(' ')}>
                        {t.name}
                    </div>
                    <div className={['text-sm',
                                    active ? 'text-slate-800' : 'text-slate-200',].join(' ')}>
                        Тимлид: {t.lead.name}
                    </div>
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
