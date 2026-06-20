'use client';

import Panel from '@/components/ui/Panel';
import TrashIcon from '@/components/ui/icons/TrashIcon';
import { Team } from './types';

export default function TeamSidebar({
                                      teams,
                                      activeId,
                                      onSelect,
                                      onAddTeam,
                                      onDeleteTeam,
                                    }: {
  teams: Team[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAddTeam?: () => void;
  onDeleteTeam?: (id: string, name: string) => void;
}) {
  const hasTeams = teams.length > 0;

  return (
    <Panel className="p-4 w-full space-y-3 t-surface lg:w-[320px] lg:shrink-0 lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto custom-scroll">
      <h2 className="text-lg font-semibold px-1">Мои команды</h2>

      {/* новая плитка «Добавить команду» — только если есть права */}
      {onAddTeam && (
        <button
          onClick={onAddTeam}
          className={[
            'group w-full rounded-2xl border-app border border-dashed t-accent-grad/20',
            ' hover:brightness-110 p-4 text-left',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl ring-1 ring-app group-hover:ring-emerald-400/40">
              <span className="text-lg leading-none">＋</span>
            </span>
            <div>
              <div className="font-medium">Создать команду</div>
            </div>
          </div>
        </button>
      )}

      {!hasTeams ? (
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-400 ring-1 ring-white/10 px-4 py-3 text-slate-900">
          Вы не состоите ни в одной команде
        </div>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => {
            const active = t.id === activeId;
            const membersCount = t.members.length;
            return (
              <li key={t.id} className="group relative">
                <button
                  onClick={() => onSelect(t.id)}
                  className={[
                    'relative w-full text-left rounded-2xl px-4 py-3 transition-colors',
                    'ring-1 ring-app t-surface',
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
                  <div className="relative z-[1] pr-8 space-y-1">
                    <div className={[
                      'font-semibold truncate',
                      active ? 'text-black' : 'text-app',
                    ].join(' ')}>
                      {t.name}
                    </div>
                    <div className={[
                      'text-xs flex items-center gap-2 uppercase tracking-wide',
                      active ? 'text-slate-700' : 'text-app-2',
                    ].join(' ')}>
                      <span className="rounded-full bg-app-hover px-2 py-0.5">
                        {membersCount} {membersCount === 1 ? 'участник' : 'участников'}
                      </span>
                    </div>
                    {t.description && (
                      <p className={[
                        'text-xs line-clamp-2',
                        active ? 'text-slate-700' : 'text-app-2',
                      ].join(' ')}>
                        {t.description}
                      </p>
                    )}
                  </div>
                </button>

                {/* Иконка мусорки при наведении — только если есть права */}
                {onDeleteTeam && <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTeam(t.id, t.name);
                  }}
                  className={[
                    'absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-all opacity-0 group-hover:opacity-100',
                    'text-app-2 hover:text-red-400 hover:bg-red-400/10',
                    active ? 'text-app-3 hover:text-red-500' : ''
                  ].join(' ')}
                  title="Удалить команду"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
