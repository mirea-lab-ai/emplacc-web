'use client';

import Panel from '@/components/ui/Panel';

export type Tab = 'board' | 'teams' | 'settings';

export default function ProjectsNav({
                                      tab,
                                      onChange,
                                    }: {
  tab: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <Panel className="p-3 t-surface">
      <NavButton label="Доска"    active={tab === 'board'}    onClick={() => onChange('board')} />
      <NavButton label="Команды"  active={tab === 'teams'}    onClick={() => onChange('teams')} />
      <NavButton label="Настройки" active={tab === 'settings'} onClick={() => onChange('settings')} />
    </Panel>
  );
}

function NavButton({
                     label,
                     active,
                     onClick,
                   }: {
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left rounded-xl px-4 py-2 transition-colors',
        active ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold' : 'font-semibold text-slate-300 hover:text-white',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
