'use client';

type NotesFormProps = {
  title: string;
  taskLabel: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
};

export default function NotesForm({
                                    title,
                                    taskLabel,
                                    value,
                                    placeholder,
                                    onChange,
                                  }: NotesFormProps) {
  return (
    <div className="rounded-2xl t-surface bg-white/10 border border-white/20 text-white p-6 ring-1 ring-white/5">
      <h2 className="text-3xl font-semibold mb-2">{title}</h2>
      <p className="text-slate-300 mb-4">{taskLabel}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[220px] rounded-xl t-surface text-slate-100 p-4 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
      />
    </div>
  );
}
