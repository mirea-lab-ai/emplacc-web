'use client';

type Props = {
  taskName: string;
  description: string;
  loading?: boolean;
  onClick: (taskName: string, description: string) => void;
  disabled?: boolean;
  helperText?: string | null;
};

export default function PlanItem({ taskName, description, loading, onClick, disabled, helperText }: Props) {
  const displayName = loading ? 'Загрузка...' : taskName || 'Задача не найдена';
  const isInactive = loading || disabled;
  const baseClasses = 'rounded-xl px-4 py-2 backdrop-blur-sm border border-white/20 text-white ring-1 ring-white/10 transition-colors';
  const stateClasses = isInactive
    ? 'bg-white/5 cursor-not-allowed opacity-60'
    : 'bg-white/10 hover:bg-white/20 cursor-pointer';

  return (
    <li
      onClick={() => {
        if (!isInactive) {
          onClick(displayName, description);
        }
      }}
      className={`${baseClasses} ${stateClasses}`}
    >
      <div className="font-medium mb-1">{displayName}</div>
      {description && (
        <div className="text-slate-400 text-sm truncate">
          {description}
        </div>
      )}
      {helperText && (
        <div className="text-slate-500 text-xs mt-1">{helperText}</div>
      )}
    </li>
  );
}
