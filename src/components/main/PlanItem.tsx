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
  const baseClasses = 'rounded-xl px-4 py-2 backdrop-blur-sm border border-app text-app ring-1 ring-app transition-colors';
  const stateClasses = isInactive
    ? 'bg-app-subtle cursor-not-allowed opacity-60'
    : 'bg-app-hover hover:bg-app-hover cursor-pointer';

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
        <div className="text-app-2 text-sm truncate">
          {description}
        </div>
      )}
      {helperText && (
        <div className="text-app-3 text-xs mt-1">{helperText}</div>
      )}
    </li>
  );
}
