'use client';

export default function TextField({
                                    label,
                                    value,
                                    onChange,
                                    placeholder,
                                    error,
                                    type = 'text',
                                    disabled = false,
                                    readOnly = false,
                                  }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  disabled?: boolean;
  readOnly?: boolean;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-app-2">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        className={[
          'h-12 w-full rounded-xl px-4',
          't-surface text-app placeholder:text-app-3',
          'ring-1 ring-app focus:outline-none focus:ring-2',
          'disabled:opacity-60 disabled:cursor-not-allowed',
          error
            ? 'focus:ring-rose-500/60 ring-rose-500/60'
            : 'focus:ring-emerald-500/50',
        ].join(' ')}
      />
      {error && <span className="text-rose-400 text-sm">{error}</span>}
    </label>
  );
}
