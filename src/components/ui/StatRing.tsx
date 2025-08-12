export default function StatRing({ value, label }: { value: number; label: string }) {
    const r = 42;
    const c = 2 * Math.PI * r;
    const dash = (value / 100) * c;

    return (
        <div className="flex flex-col items-center">
            <svg width="120" height="120" viewBox="0 0 120 120" aria-label={label}>
                <circle cx="60" cy="60" r={r} strokeWidth="10" className="fill-none stroke-slate-600/60" />
                <circle
                    cx="60" cy="60" r={r} strokeWidth="10"
                    className="fill-none stroke-sky-400"
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                />
                <text x="60" y="64" textAnchor="middle" className="text-xl font-semibold fill-slate-100">
                    {value}%
                </text>
            </svg>
            <div className="mt-2 text-sm text-slate-300">{label}</div>
        </div>
    );
}
