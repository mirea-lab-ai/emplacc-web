'use client';

import Panel from '@/components/ui/Panel';

export type Tab = 'my' | 'board' | 'teams' | 'settings';

export default function ProjectsNav({
  tab,
  onChange,
  disabled,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  disabled?: boolean;
}) {
  const canNavigate = !disabled;
  return (
    <Panel className="p-3 t-surface">
      <NavButton label="Мои проекты" active={tab === 'my'} onClick={() => onChange('my')} />
      <div className="mb-2" />
      <NavButton label="Доска"    active={tab === 'board'}    onClick={() => canNavigate && onChange('board')} disabled={!canNavigate} />
      <NavButton label="Команды"  active={tab === 'teams'}    onClick={() => canNavigate && onChange('teams')} disabled={!canNavigate} />
      <NavButton label="Настройки" active={tab === 'settings'} onClick={() => canNavigate && onChange('settings')} disabled={!canNavigate} />
    </Panel>
  );
}

function NavButton({
                     label,
                     active,
                     onClick,
                     disabled,
                   }: {
  label: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full text-left rounded-xl px-4 py-2 transition-colors',
        disabled ? 'opacity-50 cursor-not-allowed' : '',
        active ? 'bg-gradient-to-br from-emerald-500 to-lime-400 text-black font-semibold' : 'font-semibold text-app-2 hover:text-app',
      ].join(' ')}
    >
      {label}
    </button>
  );
}
