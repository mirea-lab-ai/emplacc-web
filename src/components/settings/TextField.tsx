'use client';

export default function TextField({
                                    label,
                                    value,
                                    onChange,
                                    placeholder,
                                    error,
                                    type = 'text',
                                  }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-slate-200">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={[
          'h-12 w-full rounded-xl px-4',
          'bg-emerald-950 text-slate-100 placeholder:text-slate-500',
          'ring-1 ring-white/10 focus:outline-none focus:ring-2',
          error
            ? 'focus:ring-rose-500/60 ring-rose-500/60'
            : 'focus:ring-emerald-500/50',
        ].join(' ')}
      />
      {error && <span className="text-rose-400 text-sm">{error}</span>}
    </label>
  );
}
