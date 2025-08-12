export default function ProgressBar({ value }: { value: number }) {
    return (
        <div className="w-full rounded-lg border border-slate-600 bg-slate-800/60 p-1">
            <div
                className="h-4 rounded-md bg-sky-500 transition-[width]"
                style={{ width: `${value}%` }}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={100}
            />
        </div>
    );
}
