type Props = {
  seconds: number;
  progress: number; // 0..100
  running: boolean;
  onStart: () => void;
  onBreak: () => void;
  onComplete: () => void;
};

const pad = (n: number) => n.toString().padStart(2, '0');

export default function TimerBar({
                                   seconds,
                                   progress,
                                   running,
                                   onStart,
                                   onBreak,
                                   onComplete,
                                 }: Props) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;

  return (
    <div>
      <div className="flex items-center gap-6">
        <div className="text-[56px] leading-none font-semibold tabular-nums">{mm}:{pad(ss)}</div>

        <div className="relative h-4 w-full rounded-full bg-[#1c2540]">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-400 via-blue-500 to-fuchsia-500 transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-6">
        <button
          onClick={onStart}
          className="rounded-xl bg-[#3452ff] px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px transition"
        >
          Start
        </button>

        <button
          onClick={onBreak}
          className="rounded-xl bg-[#2b3681] px-8 py-3 font-semibold text-slate-200 hover:brightness-110 active:translate-y-px transition"
        >
          Break
        </button>

        <button
          onClick={onComplete}
          className="rounded-xl bg-[#ef4657] px-8 py-3 font-semibold text-white hover:brightness-110 active:translate-y-px transition"
        >
          Complete
        </button>
      </div>
    </div>
  );
}
