'use client';

type NotesFormProps = {
  title: string;
  taskLabel: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  onImproveClick?: () => void;
  isImproving?: boolean;
};

export default function NotesForm({
                                    title,
                                    taskLabel,
                                    value,
                                    placeholder,
                                    onChange,
                                    onImproveClick,
                                    isImproving = false,
                                  }: NotesFormProps) {
  return (
    <div className="rounded-2xl t-surface bg-app-hover border border-app text-app p-6 ring-1 ring-app">
      <h2 className="text-3xl font-semibold mb-2">{title}</h2>
      <p className="text-app-2 mb-4">{taskLabel}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[220px] rounded-xl t-surface text-app p-4 ring-1 ring-app focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
      {onImproveClick && (
        <div className="mt-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onImproveClick}
            disabled={isImproving}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span className="inline-flex items-center rounded-lg border border-emerald-300/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
              BETA
            </span>
            {isImproving ? 'Генерируем…' : 'Сгенерировать комментарий'}
          </button>
        </div>
      )}
    </div>
  );
}
