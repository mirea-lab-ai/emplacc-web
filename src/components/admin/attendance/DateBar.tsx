'use client';

import { useMemo } from 'react';

export default function DateBar({
                                  value,                // формат YYYY-MM-DD
                                  onChange,
                                  onPrev,
                                  onNext,
                                }: {
  value: string;
  onChange: (isoDate: string) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const ruPretty = useMemo(() => {
    const d = new Date(value + 'T00:00:00');
    const opts: Intl.DateTimeFormatOptions = {
      weekday: 'short',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    };
    return new Intl.DateTimeFormat('ru-RU', opts).format(d);
  }, [value]);

  return (
    <div className="flex flex-wrap items-center gap-3 justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onPrev}
          className="rounded-xl bg-[#2b3681] px-3 py-2 text-slate-200 hover:brightness-110 active:translate-y-px"
          aria-label="Предыдущий день"
        >
          ←
        </button>
        <div className="text-xl font-semibold">{ruPretty}</div>
        <button
          onClick={onNext}
          className="rounded-xl bg-[#2b3681] px-3 py-2 text-slate-200 hover:brightness-110 active:translate-y-px"
          aria-label="Следующий день"
        >
          →
        </button>
      </div>

      <label className="inline-flex items-center gap-2 text-app-2">
        <span className="hidden sm:inline">Перейти к дате:</span>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 rounded-xl t-input px-3 ring-1 ring-app text-app focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        />
      </label>
    </div>
  );
}
