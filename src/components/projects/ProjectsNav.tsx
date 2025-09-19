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
    <Panel className="p-3 backdrop-blur-md bg-white/5 border border-white/10">
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
        active ? 'bg-emerald-700' : 'text-slate-200 hover:bg-emerald-950',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
